#!/usr/bin/env python3
"""
Architecture-diagram covers for case studies that have no measured series.

gen_dashboards.py draws a cover from a project's `chart.series`; projects without
real numbers to plot get a system diagram instead — what flows where — rather
than an invented chart. Output is a plain SVG in public/images/dash/<slug>.svg.

Run:  python3 tools/gen_diagrams.py
Palette and type mirror src/styles/global.css; each diagram takes its project's
brand accent so the cover and the case study share one colourway.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/images/dash'

INK = '#1d1d1f'
FONT = 'Inter, -apple-system, Helvetica, Arial, sans-serif'
W, H = 1600, 1000

# slug -> (wordmark, accent, title, [(node title, node sub)], gate index, [chips])
# `gate` marks the node that can stop the flow (the guardrail), drawn emphasised.
DIAGRAMS = {
    'ai-opportunity-assessment': (
        'Assessment Engine', '#0f8a6c', 'Discovery call → ROI-backed report',
        [('Call transcript', 'Discovery session'), ('Fact extraction', 'Every fact cited'),
         ('Opportunity sizing', 'Hours × conservative cost'), ('Honesty gate', 'No source, no claim'),
         ('Branded report', 'Human-reviewed')],
        3, ['Claude API', 'Python', 'Structured outputs', 'PDF / HTML'],
    ),
    'customer-approval-agent': (
        'Approval Pipeline', '#2f6fdd', 'Programme eligibility, decided automatically',
        [('Playwright runs', 'Scheduled collection'), ('Snowflake', 'Governed tables'),
         ('Business rules', 'Encoded in code'), ('Approve / reject', 'Edge cases flagged'),
         ('Tableau', 'Leadership KPIs')],
        2, ['Python', 'Playwright', 'Snowflake', 'Claude Code', 'Tableau'],
    ),
    'instagram-dm-assistant': (
        'DM Assistant', '#c13584', 'Instagram enquiries, answered 24/7 within rules',
        [('Instagram DM', 'Messenger Platform'), ('Webhook', 'Real-time intake'),
         ('Approved facts', 'Closed knowledge base'), ('In scope?', 'Rules check'),
         ('Reply or hand over', 'Owner gets the rest')],
        3, ['Meta Messenger Platform', 'Claude API', 'Node', 'Vercel'],
    ),
    'agent-skills-library': (
        'Skills Library', '#d97757', '28 workflows → one versioned library',
        [('28 workflows', 'Scattered prompts & scripts'), ('Common format', 'Purpose · steps · guardrails'),
         ('Git repository', 'Reviewed & versioned'), ('Claude Code · Codex', 'Same skills everywhere'),
         ('Notion sync', 'One source of truth')],
        2, ['Claude Code', 'Codex CLI', 'MCP', 'Git', 'Notion API'],
    ),
    'vinted-tracker': (
        'Vinted Tracker', '#007782', 'Reselling, from purchase to profit',
        [('Item photos', 'Sourced stock'), ('Sales agent', 'Drafts title & price'),
         ('SQLite ledger', 'Cost · fees · sales'), ('Analytics', 'P&L · sell-through'),
         ('Vinted', 'Published by me')],
        4, ['Python', 'Streamlit', 'SQLite', 'LLM vision', '780+ tests'],
    ),
    'job-hunt-pipeline': (
        'job-hunt', '#5b5bd6', 'Official job feeds → a verified, tailored CV',
        [('5 sources', 'Greenhouse · Lever · Ashby…'), ('Scorer', 'Hot / Warm / Cold'),
         ('SQLite tracker', 'Status per role'), ('CV builder', 'One source profile'),
         ('Verifier', 'Nothing invented')],
        4, ['Python', 'Typer', 'SQLite', 'python-docx', 'Headless Chrome'],
    ),
    'blarneykey': (
        'BlarneyKey', '#1f8a4c', 'Dictation that never leaves your Mac',
        [('Hold hotkey', 'Push-to-talk'), ('Local audio', 'Captured on device'),
         ('Whisper', 'Apple Neural Engine'), ('No network', 'Nothing uploaded'),
         ('Typed text', 'Into the active app')],
        3, ['Swift', 'SwiftUI', 'Whisper', 'Neural Engine', 'Open source'],
    ),
}


def esc(t: str) -> str:
    return t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def tint(hex_: str, k: float) -> str:
    """Blend a colour toward white by k (0 = unchanged, 1 = white)."""
    r, g, b = (int(hex_[i:i + 2], 16) for i in (1, 3, 5))
    return '#%02x%02x%02x' % tuple(round(c + (255 - c) * k) for c in (r, g, b))


# Cover style per project. A real headline number gets the "hero" treatment
# (one big figure); everything else gets "bold" (three large flow blocks, the
# guardrail step highlighted). Both are legible at card size, which the old
# five-box diagram was not. Hero figures must be real — never a placeholder.
HERO = {
    'vinted-tracker': ('194', 'orders tracked, 183 items', 'True profit after every fee'),
    'job-hunt-pipeline': ('1,350', 'roles from 71 companies', '154 scored hot, every CV verified'),
    'agent-skills-library': ('28', 'AI workflows, one library', 'Versioned in Git, synced to Notion'),
    'blarneykey': ('€0', 'and fully offline', 'Whisper on the Apple Neural Engine'),
}
SHORT = {
    'ai-opportunity-assessment': 'Call → ROI report',
    'customer-approval-agent': 'Rules, not reviewers',
    'instagram-dm-assistant': 'DMs answered 24/7',
}


def render_bold(slug, wordmark, accent, title, nodes, gate, chips) -> str:
    """Dark card: short title, three big blocks centred on the guardrail step."""
    start = min(max(gate - 1, 0), len(nodes) - 3)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">',
         f'<rect width="{W}" height="{H}" fill="#111114"/>',
         f'<circle cx="1350" cy="150" r="420" fill="{accent}" opacity=".18"/>',
         f'<text x="100" y="150" font-size="34" font-weight="600" fill="{tint(accent, .4)}">{esc(wordmark)}</text>',
         f'<text x="100" y="270" font-size="86" font-weight="800" letter-spacing="-2" fill="#fff">{esc(SHORT.get(slug, title))}</text>']
    nw = 440
    for i, (head, sub) in enumerate(nodes[start:start + 3]):
        x = 100 + i * (nw + 40)
        is_gate = start + i == gate
        o.append(f'<rect x="{x}" y="420" width="{nw}" height="300" rx="32" fill="{accent if is_gate else "#1f1f24"}"/>')
        o.append(f'<text x="{x + 40}" y="545" font-size="46" font-weight="800" fill="#fff">{esc(head)}</text>')
        o.append(f'<text x="{x + 40}" y="610" font-size="30" fill="{tint(accent, .55) if not is_gate else "#ffffff"}" opacity="{1 if not is_gate else .8}">{esc(sub)}</text>')
    o.append(f'<text x="100" y="860" font-size="36" font-weight="600" fill="#fff" opacity=".7">{esc(" · ".join(chips[:4]))}</text>')
    o.append('</svg>')
    return '\n'.join(o)


def render_hero(slug, wordmark, accent, title, nodes, gate, chips) -> str:
    """Tinted card led by one real figure."""
    big, line, sub = HERO[slug]
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">',
         f'<rect width="{W}" height="{H}" fill="{tint(accent, .92)}"/>',
         f'<text x="100" y="150" font-size="34" font-weight="600" fill="{accent}">{esc(wordmark)}</text>',
         f'<text x="90" y="560" font-size="{420 if len(big) <= 3 else 340}" font-weight="800" letter-spacing="-14" fill="{accent}">{esc(big)}</text>',
         f'<text x="100" y="660" font-size="54" font-weight="700" fill="{INK}">{esc(line)}</text>',
         f'<text x="100" y="730" font-size="36" fill="#555">{esc(sub)}</text>']
    x = 100
    for c in chips[:4]:
        w = 40 + 19 * len(c)
        o.append(f'<rect x="{x:.0f}" y="820" width="{w:.0f}" height="72" rx="36" fill="#fff"/>')
        o.append(f'<text x="{x + 22:.0f}" y="868" font-size="32" fill="{INK}">{esc(c)}</text>')
        x += w + 16
    o.append('</svg>')
    return '\n'.join(o)


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, spec in DIAGRAMS.items():
        render = render_hero if slug in HERO else render_bold
        (OUT / f'{slug}.svg').write_text(render(slug, *spec))
        print('wrote', slug)
