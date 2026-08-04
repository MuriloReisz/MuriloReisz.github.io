#!/usr/bin/env python3
"""
Generate a bespoke dashboard mockup per project, from that project's own data.

Why this exists: every project image used to be a ~670-byte grey gradient
labelled "Sample report N/9". On a data-analyst portfolio the dashboard *is* the
evidence, so each cover is now drawn from the project's real `chart.series`,
`findings` and title — the picture and the case study can no longer disagree.

Run:  python3 tools/gen_dashboards.py
Only the .png lands in public/images/dash/ — the SVG is an intermediate, written
to a temp dir and rasterised with `sips` (built into macOS), so the build does
not ship both copies of every dashboard.

Palette and type mirror src/styles/global.css so the renders look like the site.
"""

import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'src/data/projects.ts'
OUT = ROOT / 'public/images/dash'

# ---- palette, from :root in global.css -------------------------------------
CANVAS, PARCH, INK = '#ffffff', '#f5f5f7', '#1d1d1f'
INK48, HAIR = '#6b6b6b', '#e0e0e0'
PRIMARY = '#6d5ef0'
RAMP = ['#6d5ef0', '#2f86dd', '#5aa9f0', '#8cc4f5', '#b6dbf9', '#d8ecfc']
FONT = 'Inter, -apple-system, Helvetica, Arial, sans-serif'

W, H = 1600, 1000


def axis_fmt(span: float) -> str:
    """Decimals for a gridline label, so a 0.5-wide span isn't all one number."""
    if span >= 20:
        return '.0f'
    if span >= 4:
        return '.1f'
    return '.2f'


def esc(t: str) -> str:
    return (t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
             .replace('\\’', '’').replace("\\'", '’'))


def clip(t: str, n: int) -> str:
    t = t.strip()
    return t if len(t) <= n else t[: n - 1].rstrip() + '…'


def parse() -> list[dict]:
    src = DATA.read_text(encoding='utf-8')
    out = []
    for block in re.split(r'\n  \{\n', src):
        m = re.search(r"slug: '([^']+)'", block)
        if not m:
            continue
        get = lambda k: (re.search(rf"{k}: '((?:[^'\\]|\\.)*)'", block) or [None, ''])[1]
        series = [(lab, float(val)) for lab, val in
                  re.findall(r"\{ label: '([^']*)', value: ([\d.]+) \}", block)]
        chart_title = (re.search(r"chart: \{\s*title: '((?:[^'\\]|\\.)*)'", block) or [None, ''])[1]
        unit = (re.search(r"unit: '([^']*)'", block) or [None, ''])[1]
        findings = re.findall(
            r"value: '((?:[^'\\]|\\.)*)',(?:[^}]*?)label: '((?:[^'\\]|\\.)*)'", block)
        out.append(dict(slug=m.group(1), title=get('title'), org=get('org'),
                        period=get('period'), eyebrow=get('eyebrow'),
                        chart_title=chart_title, unit=unit,
                        series=series, findings=findings[:3]))
    return out


def chart_bars(x, y, w, h, series, unit):
    """Bar chart — used for short series."""
    vals = [v for _, v in series]
    hi = max(vals) or 1
    fmt = axis_fmt(hi)
    n = len(series)
    gap = 14
    bw = (w - gap * (n - 1)) / n
    parts = [
        '<defs>',
        f'<linearGradient id="barHi" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="#8f7ff5"/><stop offset="1" stop-color="{RAMP[0]}"/></linearGradient>',
        f'<linearGradient id="barLo" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{RAMP[3]}"/><stop offset="1" stop-color="{RAMP[2]}"/></linearGradient>',
        '</defs>',
        '<g>',
    ]
    # gridlines + y labels
    for i in range(5):
        gy = y + h - (h * i / 4)
        parts.append(f'<line x1="{x}" y1="{gy:.1f}" x2="{x+w}" y2="{gy:.1f}" stroke="{HAIR}" '
                     f'stroke-width="1" stroke-dasharray="{"0" if i == 0 else "3 5"}"/>')
        parts.append(f'<text x="{x-12}" y="{gy+5:.1f}" text-anchor="end" font-family="{FONT}" '
                     f'font-size="17" fill="{INK48}">{format(hi*i/4, fmt)}</text>')
    for i, (lab, v) in enumerate(series):
        bh = (v / hi) * h
        bx = x + i * (bw + gap)
        by = y + h - bh
        last = i == n - 1
        parts.append(f'<rect x="{bx:.1f}" y="{by:.1f}" width="{bw:.1f}" height="{bh:.1f}" '
                     f'rx="7" fill="url(#{"barHi" if last else "barLo"})"/>')
        if last:
            parts.append(f'<text x="{bx+bw/2:.1f}" y="{by-14:.1f}" text-anchor="middle" '
                         f'font-family="{FONT}" font-size="17" font-weight="700" fill="{RAMP[0]}">'
                         f'{format(v, fmt)}</text>')
        parts.append(f'<text x="{bx+bw/2:.1f}" y="{y+h+30:.0f}" text-anchor="middle" '
                     f'font-family="{FONT}" font-size="17" fill="{INK48}">{esc(clip(lab,10))}</text>')
    parts.append('</g>')
    return '\n'.join(parts)


def chart_line(x, y, w, h, series, unit):
    """Line + area — used for longer series, so trend reads clearly."""
    vals = [v for _, v in series]
    hi, lo = max(vals), min(vals)
    span = (hi - lo) or 1
    pad = span * 0.18
    hi, lo = hi + pad, max(0, lo - pad)
    span = hi - lo
    fmt = axis_fmt(span)
    n = len(series)
    px = lambda i: x + (w * i / (n - 1))
    py = lambda v: y + h - ((v - lo) / span) * h
    pts = [(px(i), py(v)) for i, (_, v) in enumerate(series)]
    parts = [
        '<defs>',
        f'<linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{RAMP[0]}" stop-opacity="0.28"/>'
        f'<stop offset="1" stop-color="{RAMP[0]}" stop-opacity="0"/></linearGradient>',
        '</defs>',
        '<g>',
    ]
    for i in range(5):
        gy = y + h - (h * i / 4)
        parts.append(f'<line x1="{x}" y1="{gy:.1f}" x2="{x+w}" y2="{gy:.1f}" stroke="{HAIR}" '
                     f'stroke-width="1" stroke-dasharray="{"0" if i == 0 else "3 5"}"/>')
        parts.append(f'<text x="{x-12}" y="{gy+5:.1f}" text-anchor="end" font-family="{FONT}" '
                     f'font-size="17" fill="{INK48}">{format(lo + span*i/4, fmt)}</text>')
    d = 'M ' + ' L '.join(f'{a:.1f} {b:.1f}' for a, b in pts)
    parts.append(f'<path d="{d} L {pts[-1][0]:.1f} {y+h:.1f} L {pts[0][0]:.1f} {y+h:.1f} Z" '
                 f'fill="url(#lineArea)"/>')
    parts.append(f'<path d="{d}" fill="none" stroke="{RAMP[0]}" stroke-width="3.5" '
                 f'stroke-linecap="round" stroke-linejoin="round"/>')
    for i, (a, b) in enumerate(pts):
        last = i == n - 1
        parts.append(f'<circle cx="{a:.1f}" cy="{b:.1f}" r="{7 if last else 5}" '
                     f'fill="{RAMP[0] if last else CANVAS}" stroke="{RAMP[0]}" stroke-width="3"/>')
    step = max(1, n // 6)
    for i, (lab, _) in enumerate(series):
        if i % step == 0 or i == n - 1:
            parts.append(f'<text x="{px(i):.1f}" y="{y+h+30:.0f}" text-anchor="middle" '
                         f'font-family="{FONT}" font-size="17" fill="{INK48}">{esc(clip(lab,10))}</text>')
    parts.append('</g>')
    return '\n'.join(parts)


def build(p: dict) -> str:
    s = p['series']
    kind = 'line' if len(s) >= 10 else 'bar'
    first, last = s[0][1], s[-1][1]
    delta = ((last - first) / first * 100) if first else 0
    arrow = '▼' if delta < 0 else '▲'
    # For most of these metrics (error, hours, churn) down is the win.
    good = delta < 0 if any(k in p['unit'].lower() or k in p['chart_title'].lower()
                            for k in ('error', 'hour', 'churn', 'day', 'mape', 'detect', 'response')) else delta > 0
    dcol = '#1f7a44' if good else '#b5342b'

    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
         '<defs>',
         f'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
         f'<stop offset="0" stop-color="#f8f8fb"/><stop offset="1" stop-color="{PARCH}"/></linearGradient>',
         f'<linearGradient id="cardTop" x1="0" y1="0" x2="1" y2="0">'
         f'<stop offset="0" stop-color="{RAMP[0]}"/><stop offset="1" stop-color="{RAMP[1]}"/></linearGradient>',
         '</defs>',
         f'<rect width="{W}" height="{H}" fill="url(#bg)"/>']

    # window chrome, echoing .ccd__bar on the site
    o.append(f'<rect x="0" y="0" width="{W}" height="52" fill="{CANVAS}"/>')
    o.append(f'<rect x="0" y="50" width="{W}" height="2" fill="url(#cardTop)"/>')
    for i, c in enumerate(['#ff5f57', '#febc2e', '#28c840']):
        o.append(f'<circle cx="{28+i*22}" cy="26" r="6.5" fill="{c}"/>')
    o.append(f'<text x="112" y="32" font-family="{FONT}" font-size="17" fill="{INK48}">'
             f'{esc(p["slug"])} · internal</text>')

    # header
    o.append(f'<text x="44" y="112" font-family="{FONT}" font-size="19" font-weight="600" '
             f'letter-spacing="2.2" fill="{PRIMARY}">{esc(p["eyebrow"][:44])}</text>')
    o.append(f'<text x="44" y="164" font-family="{FONT}" font-size="42" font-weight="700" '
             f'letter-spacing="-1.2" fill="{INK}">{esc(clip(p["title"], 46))}</text>')
    o.append(f'<text x="44" y="200" font-family="{FONT}" font-size="20" fill="{INK48}">'
             f'{esc(p["org"])} · {esc(p["period"])}</text>')
    # live pill
    o.append(f'<rect x="{W-192}" y="132" width="148" height="42" rx="21" fill="{CANVAS}" stroke="{HAIR}"/>')
    o.append(f'<circle cx="{W-166}" cy="153" r="6" fill="#28c840"/>')
    o.append(f'<text x="{W-150}" y="160" font-family="{FONT}" font-size="18" fill="{INK48}">'
             f'Live data</text>')

    # KPI cards from the findings
    cw, cx0, cy = (W - 88 - 2 * 20) / 3, 44, 236
    for i, (val, lab) in enumerate(p['findings']):
        x = cx0 + i * (cw + 20)
        o.append(f'<rect x="{x:.0f}" y="{cy}" width="{cw:.0f}" height="136" rx="14" '
                 f'fill="{CANVAS}" stroke="{HAIR}"/>')
        o.append(f'<rect x="{x:.0f}" y="{cy}" width="46" height="5" rx="2.5" fill="url(#cardTop)"/>')
        o.append(f'<text x="{x+26:.0f}" y="{cy+50}" font-family="{FONT}" font-size="17" '
                 f'fill="{INK48}">{esc(clip(lab, 46))}</text>')
        o.append(f'<text x="{x+26:.0f}" y="{cy+108}" font-family="{FONT}" font-size="46" '
                 f'font-weight="700" letter-spacing="-1.4" fill="{PRIMARY}">{esc(clip(val, 13))}</text>')

    # main chart panel
    py0 = 412
    o.append(f'<rect x="44" y="{py0}" width="{W-88}" height="{H-py0-44}" rx="14" '
             f'fill="{CANVAS}" stroke="{HAIR}"/>')
    o.append(f'<text x="80" y="{py0+52}" font-family="{FONT}" font-size="24" font-weight="600" '
             f'letter-spacing="-0.5" fill="{INK}">{esc(clip(p["chart_title"], 54))}</text>')
    o.append(f'<text x="80" y="{py0+82}" font-family="{FONT}" font-size="18" fill="{INK48}">'
             f'measured in {esc(p["unit"])}</text>')
    o.append(f'<text x="{W-80}" y="{py0+60}" text-anchor="end" font-family="{FONT}" '
             f'font-size="30" font-weight="700" fill="{dcol}">{arrow} {abs(delta):.0f}%</text>')
    o.append(f'<text x="{W-80}" y="{py0+86}" text-anchor="end" font-family="{FONT}" '
             f'font-size="17" fill="{INK48}">first to latest</text>')

    plot = (140, py0 + 118, W - 140 - 80, H - py0 - 44 - 118 - 62)
    o.append((chart_line if kind == 'line' else chart_bars)(*plot, s, p['unit']))
    o.append('</svg>')
    return '\n'.join(o)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    projects = parse()
    print(f'{len(projects)} projects\n')
    total = 0.0
    with tempfile.TemporaryDirectory() as tmp:
        for p in projects:
            svg = Path(tmp) / f'{p["slug"]}.svg'
            png = OUT / f'{p["slug"]}.png'
            svg.write_text(build(p), encoding='utf-8')
            subprocess.run(['sips', '-s', 'format', 'png', str(svg), '--out', str(png)],
                           check=True, capture_output=True)
            kb = png.stat().st_size / 1024
            total += kb
            print(f'  {p["slug"]:<28} {len(p["series"]):>2} pts  {kb:6.0f} KB')
    print(f'\n  {total/1024:.1f} MB total, {W}x{H} each')


if __name__ == '__main__':
    main()
