#!/usr/bin/env python3
"""
Generate two labelled-illustrative "screens" for each project that has no
real screenshots (the seven agent/product write-ups), so every case study's
Screens strip has something besides its cover.

Every number and label drawn here already appears in src/data/projects.ts —
the script restates, it never invents — and each image carries the stamp
"ILLUSTRATIVE — DRAWN FROM THE WRITE-UP, NOT A SCREENSHOT" in the frame.

Same rendering path as gen_gallery.py: SVG from Python, rasterised with
`sips`, only the PNG ships.

Run:  python3 tools/gen_screens.py
"""

import subprocess
import sys
import tempfile
import types
from pathlib import Path

# gen_dashboards imports Pillow at module level for its WebP step; this script
# only needs its SVG helpers, so stand in for PIL when it is not installed.
try:
    import PIL  # noqa: F401
except ModuleNotFoundError:
    sys.modules['PIL'] = types.ModuleType('PIL')
    sys.modules['PIL'].Image = None  # type: ignore[attr-defined]

from gen_dashboards import CANVAS, PARCH, INK, INK48, HAIR, PRIMARY, RAMP, FONT, esc, clip, parse, hex_ramp
from gen_gallery import big_tiles, wireframe, queue_list, W, H

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/images/gallery'
MONO = "JetBrains Mono, SFMono-Regular, Menlo, monospace"


def frame(inner: str, title: str, accent: str) -> str:
    """gen_gallery's frame plus the illustrative stamp, top right."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        f'<rect width="{W}" height="{H}" fill="{CANVAS}"/>'
        f'<text x="48" y="56" font-family="{FONT}" font-size="15" font-weight="600" '
        f'letter-spacing="1.6" fill="{accent}">{esc(title.upper())}</text>'
        f'<text x="{W-48}" y="56" text-anchor="end" font-family="{MONO}" font-size="12" font-weight="700" '
        f'letter-spacing="1.4" fill="{INK48}">[ ILLUSTRATIVE — DRAWN FROM THE WRITE-UP, NOT A SCREENSHOT ]</text>'
        f'{inner}</svg>'
    )


# ---------------------------------------------------------------- primitives

def stage_list(stages, ramp, done_label='done'):
    """stages: [(title, status)] — a vertical pipeline with a status chip."""
    x0, y0, w, rh, gap = 100, 120, 1200, 108, 18
    parts = []
    for i, (title, status) in enumerate(stages):
        y = y0 + i * (rh + gap)
        parts.append(f'<rect x="{x0}" y="{y}" width="{w}" height="{rh}" rx="12" fill="{PARCH}"/>')
        parts.append(f'<circle cx="{x0+44}" cy="{y+rh/2}" r="16" fill="{ramp[0]}"/>')
        parts.append(f'<text x="{x0+44}" y="{y+rh/2+6}" text-anchor="middle" font-family="{FONT}" font-size="15" font-weight="700" fill="#fff">{i+1}</text>')
        parts.append(f'<text x="{x0+90}" y="{y+rh/2+8}" font-family="{FONT}" font-size="24" font-weight="600" fill="{INK}">{esc(clip(title, 60))}</text>')
        cw = 22 + len(status) * 9
        parts.append(f'<rect x="{x0+w-40-cw}" y="{y+rh/2-18}" width="{cw}" height="36" rx="18" fill="{ramp[4]}"/>')
        parts.append(f'<text x="{x0+w-40-cw/2}" y="{y+rh/2+6}" text-anchor="middle" font-family="{MONO}" font-size="14" font-weight="700" fill="{ramp[0]}">{esc(status)}</text>')
        if i < len(stages) - 1:
            parts.append(f'<line x1="{x0+44}" y1="{y+rh/2+16}" x2="{x0+44}" y2="{y+rh+gap+rh/2-16}" stroke="{ramp[2]}" stroke-width="2" stroke-dasharray="3 6"/>')
    return ''.join(parts)


def terminal(lines, ramp):
    """lines: [(prompt, text, kind)] kind in ok|dim|hot — a dark terminal panel."""
    x0, y0, w, h = 80, 100, 1240, 620
    parts = [f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}" rx="14" fill="{INK}"/>',
             f'<circle cx="{x0+28}" cy="{y0+26}" r="6" fill="#ff5f57"/><circle cx="{x0+50}" cy="{y0+26}" r="6" fill="#febc2e"/><circle cx="{x0+72}" cy="{y0+26}" r="6" fill="#28c840"/>']
    colours = {'ok': '#e8e8ee', 'dim': '#8c8c96', 'hot': ramp[1]}
    for i, (prompt, text, kind) in enumerate(lines):
        y = y0 + 84 + i * 40
        parts.append(f'<text x="{x0+40}" y="{y}" font-family="{MONO}" font-size="19" font-weight="700" fill="{ramp[1]}">{esc(prompt)}</text>')
        parts.append(f'<text x="{x0+80}" y="{y}" font-family="{MONO}" font-size="19" fill="{colours[kind]}">{esc(text)}</text>')
    parts.append(f'<rect x="{x0+80}" y="{y0+84+len(lines)*40-18}" width="11" height="22" fill="{ramp[1]}"/>')
    return ''.join(parts)


def decision_flow(nodes, ramp):
    """nodes: [(label, kind)] kind in box|gate|out — left-to-right flow with a diamond gate."""
    n = len(nodes)
    gap = 54
    bw = (1240 - gap * (n - 1)) / n
    y, bh = 330, 150
    parts = []
    for i, (label, kind) in enumerate(nodes):
        x = 80 + i * (bw + gap)
        if kind == 'gate':
            cx, cy = x + bw / 2, y + bh / 2
            parts.append(f'<path d="M{cx} {cy-95} L{cx+bw/2} {cy} L{cx} {cy+95} L{cx-bw/2} {cy} Z" fill="{ramp[4]}" stroke="{ramp[0]}" stroke-width="3"/>')
        else:
            fill = ramp[0] if kind == 'out' else PARCH
            parts.append(f'<rect x="{x}" y="{y}" width="{bw:.0f}" height="{bh}" rx="14" fill="{fill}" stroke="{HAIR if kind != "out" else ramp[0]}" stroke-width="1.5"/>')
        colour = '#fff' if kind == 'out' else INK
        words = label.split(' ')
        rows = [' '.join(words[:len(words)//2 + 1]), ' '.join(words[len(words)//2 + 1:])] if len(label) > 16 else [label]
        for r, row in enumerate(rows):
            parts.append(f'<text x="{x+bw/2:.0f}" y="{y+bh/2+8+(r-(len(rows)-1)/2)*30:.0f}" text-anchor="middle" font-family="{FONT}" font-size="22" font-weight="600" fill="{colour}">{esc(row)}</text>')
        if i < n - 1:
            parts.append(f'<line x1="{x+bw+6:.0f}" y1="{y+bh/2}" x2="{x+bw+gap-6:.0f}" y2="{y+bh/2}" stroke="{ramp[1]}" stroke-width="3" marker-end="url(#arr)"/>')
    parts.append(f'<defs><marker id="arr" markerWidth="10" markerHeight="10" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="{ramp[1]}"/></marker></defs>')
    return ''.join(parts)


def skill_format(sections, ramp):
    """A document wireframe: one block per section of the skill format."""
    x0, y0, w = 220, 110, 960
    parts = [f'<rect x="{x0}" y="{y0}" width="{w}" height="600" rx="16" fill="{PARCH}"/>',
             f'<text x="{x0+40}" y="{y0+52}" font-family="{MONO}" font-size="16" fill="{INK48}">skill.md</text>']
    for i, (name, lines) in enumerate(sections):
        y = y0 + 90 + i * 125
        parts.append(f'<rect x="{x0+40}" y="{y}" width="8" height="90" fill="{ramp[0]}"/>')
        parts.append(f'<text x="{x0+66}" y="{y+22}" font-family="{MONO}" font-size="16" font-weight="700" fill="{ramp[0]}">## {esc(name.upper())}</text>')
        for j in range(lines):
            parts.append(f'<rect x="{x0+66}" y="{y+40+j*22}" width="{520 - j*140}" height="10" rx="5" fill="{HAIR}"/>')
    return ''.join(parts)


# ---------------------------------------------------------------- specs
# Every string and number below is lifted from src/data/projects.ts.

def specs(p):
    s = p['slug']
    wm = p['wordmark']
    if s == 'ai-opportunity-assessment':
        return [
            ('Assessment run', lambda a, r: stage_list([
                ('Extract before writing', 'cited'), ('Size opportunities conservatively', 'sized'),
                ('An honesty gate with teeth', 'gated'), ('Client-branded, human-reviewed', 'reviewed')], r)),
            ('Report structure', lambda a, r: wireframe(['Opportunities', 'Hours returned', 'Cost'], 'Every figure traced to a line in the transcript', r)),
        ]
    if s == 'customer-approval-agent':
        return [
            ('Scheduled run', lambda a, r: terminal([
                ('$', 'run approval-pipeline', 'ok'), ('>', 'collect   playwright workflows, validated', 'ok'),
                ('>', 'land      snowflake governed tables', 'ok'), ('>', 'rules     programme business rules, in code', 'hot'),
                ('>', 'edges     agent handles the awkward cases', 'ok'), ('>', 'publish   tableau dashboards on live data', 'ok'),
                ('<', 'ok', 'dim')], r)),
            ('Leadership view', lambda a, r: wireframe(['Programme KPIs', 'Regions', 'Approvals'], 'Sales performance, KPIs and underperforming regions — on live Snowflake data', r)),
        ]
    if s == 'instagram-dm-assistant':
        return [
            ('Every message', lambda a, r: decision_flow([('Instagram DM', 'box'), ('In the approved facts?', 'gate'), ('Reply', 'out'), ('Hand over to the owner', 'box')], r)),
            ('Approved facts', lambda a, r: wireframe(['Opening hours', 'Prices', 'Availability'], 'A closed book: no answer outside these facts', r)),
        ]
    if s == 'agent-skills-library':
        return [
            ('Consolidation', lambda a, r: big_tiles([('28', 'workflows, before'), ('1', 'library, after'), ('Git ⇄ Notion', 'kept in sync')])),
            ('Skill format', lambda a, r: skill_format([('Purpose', 2), ('Inputs', 3), ('Steps', 3), ('Guardrails', 2)], r)),
        ]
    if s == 'vinted-tracker':
        return [
            ('Ledger', lambda a, r: big_tiles([('194', 'orders'), ('183', 'inventory items'), ('780+', 'automated tests')])),
            ('Listing workflow', lambda a, r: decision_flow([('Photos', 'box'), ('Agent drafts title, text, price', 'box'), ('I review', 'gate'), ('Published by me', 'out')], r)),
        ]
    if s == 'job-hunt-pipeline':
        return [
            ('Scored roles', lambda a, r: queue_list([('Hot', 'strong matches', 154), ('Warm', 'worth a look', 658), ('Cold', 'filed', 433)], r)),
            ('CV verifier', lambda a, r: stage_list([
                ('Title — in the source profile?', 'verified'), ('Dates — in the source profile?', 'verified'),
                ('Numbers — in the source profile?', 'verified'), ('Skills — in the source profile?', 'verified')], r)),
        ]
    if s == 'blarneykey':
        return [
            ('One gesture', lambda a, r: terminal([
                ('$', 'hold hotkey', 'ok'), ('>', 'audio captured locally', 'ok'), ('>', 'whisper on the apple neural engine', 'hot'),
                ('>', 'text typed into the active app', 'ok'), ('>', 'network: 0 bytes sent', 'hot'), ('<', 'release', 'dim')], r)),
            ('What it costs', lambda a, r: big_tiles([('€0', 'free, no subscription'), ('0 bytes', 'of audio sent over the network'), ('100%', 'on-device')])),
        ]
    return []


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    projects = {p['slug']: p for p in parse()}
    with tempfile.TemporaryDirectory() as tmp:
        for slug in ['ai-opportunity-assessment', 'customer-approval-agent', 'instagram-dm-assistant',
                     'agent-skills-library', 'vinted-tracker', 'job-hunt-pipeline', 'blarneykey']:
            p = projects[slug]
            ramp = hex_ramp(p['accent'], p['accent2'])
            for i, (title, builder) in enumerate(specs(p), start=1):
                svg = Path(tmp) / f'{slug}-{i}.svg'
                png = OUT / f'{slug}-{i}.png'
                svg.write_text(frame(builder(p['accent'], ramp), f"{p['wordmark']} — {title}", p['accent']), encoding='utf-8')
                subprocess.run(['sips', '-s', 'format', 'png', str(svg), '--out', str(png)], check=True, capture_output=True)
                print(f'  {png.name:<40} {png.stat().st_size/1024:6.0f} KB')


if __name__ == '__main__':
    main()
