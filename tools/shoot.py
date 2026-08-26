#!/usr/bin/env python3
"""Screenshot built pages without binding a port.

No socket can listen on this machine (`listen EPERM`), so `astro preview` and any
dev server are out. Instead we open `dist/<page>/index.html` over `file://` and
intercept every request Playwright makes: anything starting `/` is an absolute
site-root URL that `file://` would 404 on, so we fulfil it from `dist/` off disk.
Without that, CSS, JS and images all silently fail and the screenshot looks
broken for reasons that have nothing to do with the change you are checking.

    python3 tools/shoot.py                      # default page set, 1440px
    python3 tools/shoot.py index 404            # named pages
    python3 tools/shoot.py index --width 390    # mobile
    python3 tools/shoot.py index --reduced      # prefers-reduced-motion: reduce
    python3 tools/shoot.py index --scroll 0,0.5,1

Output lands in tools/shots/ (gitignored), one PNG per page/variant.
"""

from __future__ import annotations

import argparse
import mimetypes
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
OUT = ROOT / "tools" / "shots"

# Page key -> path of the built HTML file, relative to dist/.
DEFAULT_PAGES = ["index", "services", "ai-services", "playground", "404"]


def html_for(page: str) -> Path:
    """Resolve a page key to its built HTML file.

    Astro's `build.format: 'directory'` means every route but 404 is a
    directory with an index.html inside.
    """
    if page in ("index", "/"):
        return DIST / "index.html"
    direct = DIST / f"{page}.html"
    if direct.is_file():
        return direct
    return DIST / page / "index.html"


def install_router(page) -> None:
    """Serve absolute `/...` requests out of dist/ instead of letting them 404."""

    def handle(route):
        url = route.request.url
        if url.startswith("file://"):
            route.continue_()
            return
        # Google Fonts and anything else off-site: abort rather than hang the
        # screenshot on a sandbox-blocked request.
        if not url.startswith(("http://localhost", "https://localhost")):
            from urllib.parse import urlparse

            parsed = urlparse(url)
            if parsed.netloc and parsed.netloc not in ("", "localhost"):
                route.abort()
                return
        route.continue_()

    # file:// pages resolve absolute paths against the filesystem root, so the
    # request URL arrives as file:///images/foo.png — catch those and remap.
    def handle_file(route):
        from urllib.parse import unquote, urlparse

        path = unquote(urlparse(route.request.url).path)
        # Anything Playwright asks for that is not inside the repo is an
        # absolute site-root URL that needs remapping into dist/.
        candidate = Path(path)
        if candidate.is_file() and str(candidate).startswith(str(ROOT)):
            route.continue_()
            return
        target = DIST / path.lstrip("/")
        if target.is_file():
            ctype, _ = mimetypes.guess_type(str(target))
            route.fulfill(
                status=200,
                body=target.read_bytes(),
                content_type=ctype or "application/octet-stream",
            )
        else:
            route.abort()

    page.route("file://**", handle_file)
    page.route("http://**", handle)
    page.route("https://**", handle)


def shoot(page, key: str, width: int, scrolls: list[float], suffix: str) -> list[Path]:
    src = html_for(key)
    if not src.is_file():
        raise SystemExit(f"no built page for {key!r} at {src} — run `npm run build` first")

    missing: list[str] = []
    page.on(
        "requestfailed",
        lambda req: missing.append(req.url) if req.resource_type in ("stylesheet", "script", "image") else None,
    )
    page.goto(src.as_uri(), wait_until="load")
    page.wait_for_timeout(900)  # let the reveal observers and rAF loop settle

    written = []
    for frac in scrolls:
        page.evaluate(
            "f => window.scrollTo(0, f * Math.max(0, document.body.scrollHeight - window.innerHeight))",
            frac,
        )
        page.wait_for_timeout(700)
        tag = "" if len(scrolls) == 1 and frac == 0 else f"-s{int(frac * 100)}"
        dest = OUT / f"{key.replace('/', '_')}-{width}{suffix}{tag}.png"
        page.screenshot(path=str(dest), full_page=(len(scrolls) == 1 and frac == 0))
        written.append(dest)

    for url in sorted(set(missing)):
        print(f"    ! failed to load: {url}", file=sys.stderr)
    return written


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pages", nargs="*", default=None, help="page keys (default: a standard set)")
    ap.add_argument("--width", type=int, default=1440)
    ap.add_argument("--height", type=int, default=900)
    ap.add_argument("--reduced", action="store_true", help="force prefers-reduced-motion: reduce")
    ap.add_argument("--dark", action="store_true", help="force the dark theme")
    ap.add_argument("--scroll", default="0", help="comma-separated scroll fractions, e.g. 0,0.5,1")
    args = ap.parse_args()

    pages = args.pages or DEFAULT_PAGES
    scrolls = [float(x) for x in args.scroll.split(",") if x.strip()]
    suffix = ("-reduced" if args.reduced else "") + ("-dark" if args.dark else "")
    OUT.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": args.width, "height": args.height},
            reduced_motion="reduce" if args.reduced else "no-preference",
            color_scheme="dark" if args.dark else "light",
            device_scale_factor=1,
        )
        page = ctx.new_page()
        install_router(page)
        for key in pages:
            for dest in shoot(page, key, args.width, scrolls, suffix):
                print(f"  {dest.relative_to(ROOT)}")
        browser.close()


if __name__ == "__main__":
    main()
