#!/usr/bin/env python3
"""
Generate the four "AI Concierge" pillar images on /ai-services (intake form,
booking, Voxer thread, Notion build log) — dark UI-mockup screenshots in the
same chrome style as the AI Command Centre dashboard, replacing the generic
"Intake form" / "Booking" grey-gradient placeholders.

Ships as plain .svg (rendered directly by the browser). Target box is
`.tl__pillar__media { aspect-ratio: 16/10 }`, so canvas is 1600x1000.

Run:  python3 tools/gen_concierge.py
"""

from pathlib import Path
from gen_dashboards import PRIMARY, RAMP, FONT, esc, clip

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/images'
W, H = 1600, 1000

BG0, BG1 = '#1c1c1e', '#0a0a0c'
CARD = '#242426'
LINE = '#333335'
TXT = '#f2f2f4'
MUTED = '#8a8a8f'
GOOD = '#34d399'


def frame(inner: str, label: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="{esc(label)}">'
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{BG0}"/><stop offset="1" stop-color="{BG1}"/></linearGradient></defs>'
        f'<rect width="{W}" height="{H}" fill="url(#bg)"/>'
        f'<rect x="0" y="0" width="{W}" height="58" fill="#141416"/>'
        f'<line x1="0" y1="58" x2="{W}" y2="58" stroke="{LINE}"/>'
        + ''.join(f'<circle cx="{34+i*24}" cy="29" r="7" fill="#3a3a3d"/>' for i in range(3))
        + f'{inner}</svg>'
    )


def field(x, y, w, label, value):
    return (
        f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="16" fill="{MUTED}">{esc(label)}</text>'
        f'<rect x="{x}" y="{y+14}" width="{w}" height="52" rx="10" fill="{CARD}" stroke="{LINE}"/>'
        f'<text x="{x+18}" y="{y+48}" font-family="{FONT}" font-size="18" fill="{TXT}">{esc(value)}</text>'
    )


def intake_form():
    inner = (
        f'<text x="80" y="140" font-family="{FONT}" font-size="30" font-weight="700" fill="{TXT}">Quick intake</text>'
        f'<text x="80" y="172" font-family="{FONT}" font-size="16" fill="{MUTED}">Five minutes, so the first call starts on the real problem.</text>'
        + field(80, 220, 640, 'Business name', 'Ardmore Timber & Panel')
        + field(80, 320, 640, 'Biggest time drain right now', 'Re-typing supplier invoices into the ledger')
        + field(80, 420, 300, 'Team size', '14 people')
        + field(400, 420, 320, 'Current tools', 'Xero · Excel · Outlook')
    )
    inner += (
        f'<rect x="80" y="510" width="180" height="50" rx="25" fill="{PRIMARY}"/>'
        f'<text x="170" y="541" text-anchor="middle" font-family="{FONT}" font-size="16" font-weight="600" fill="#ffffff">Submit</text>'
        f'<text x="290" y="540" font-family="{FONT}" font-size="14" fill="{MUTED}">Goes straight to the intake queue — no account needed.</text>'
    )
    return frame(inner, 'Intake form')


def booking():
    cal_x, cal_y, cell = 80, 150, 62
    days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    inner = f'<text x="{cal_x}" y="{cal_y-30}" font-family="{FONT}" font-size="22" font-weight="700" fill="{TXT}">August 2026</text>'
    for i, d in enumerate(days):
        inner += f'<text x="{cal_x+i*cell+cell/2:.0f}" y="{cal_y}" text-anchor="middle" font-family="{FONT}" font-size="14" fill="{MUTED}">{d}</text>'
    start_dow = 5
    highlighted = {8, 22}
    for day in range(1, 32):
        idx = start_dow + day - 1
        row, col = idx // 7, idx % 7
        cx = cal_x + col * cell + cell / 2
        cy = cal_y + 40 + row * cell
        if day in highlighted:
            inner += f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="22" fill="{PRIMARY}"/>'
            inner += f'<text x="{cx:.0f}" y="{cy+6:.0f}" text-anchor="middle" font-family="{FONT}" font-size="16" font-weight="700" fill="#ffffff">{day}</text>'
        else:
            inner += f'<text x="{cx:.0f}" y="{cy+6:.0f}" text-anchor="middle" font-family="{FONT}" font-size="16" fill="{TXT}">{day}</text>'
    lx = 780
    inner += f'<text x="{lx}" y="{cal_y-30}" font-family="{FONT}" font-size="22" font-weight="700" fill="{TXT}">Upcoming calls</text>'
    calls = [('Fri 8 Aug', '10:00 – 10:45', 'Working session — automation build'),
             ('Fri 22 Aug', '10:00 – 10:45', 'Working session — review & next steps')]
    for i, (date, time, title) in enumerate(calls):
        y = cal_y + 30 + i * 130
        inner += (f'<rect x="{lx}" y="{y}" width="740" height="100" rx="14" fill="{CARD}" stroke="{LINE}"/>'
                   f'<rect x="{lx}" y="{y}" width="6" height="100" rx="3" fill="{PRIMARY}"/>'
                   f'<text x="{lx+30}" y="{y+38}" font-family="{FONT}" font-size="18" font-weight="700" fill="{TXT}">{date} · {time}</text>'
                   f'<text x="{lx+30}" y="{y+68}" font-family="{FONT}" font-size="15" fill="{MUTED}">{esc(title)}</text>')
    return frame(inner, 'Booking two working calls a month')


def voxer():
    inner = f'<text x="80" y="140" font-family="{FONT}" font-size="26" font-weight="700" fill="{TXT}">Voxer · Ardmore Timber</text>'
    msgs = [
        ('them', 'Quick one — can the reminder also fire for overdue invoices, not just new ones?', '0:18', '09:12'),
        ('me', 'Yep — adding a second trigger, live by this afternoon.', '0:09', '09:15'),
        ('them', 'Perfect, that was the annoying one.', None, '09:16'),
        ('me', 'Shipped. Test it on the Kilcoole account when you get a chance.', '0:12', '11:40'),
    ]
    y = 200
    for who, text, dur, time in msgs:
        mine = who == 'me'
        bw = 620
        x = W - 80 - bw if mine else 80
        fill = PRIMARY if mine else CARD
        stroke = 'none' if mine else LINE
        color = '#ffffff' if mine else TXT
        muted = 'rgba(255,255,255,0.7)' if mine else MUTED
        if dur:
            h = 78
            inner += (f'<rect x="{x}" y="{y}" width="bw_ph" height="{h}" rx="16" fill="{fill}" stroke="{stroke}"/>'.replace('bw_ph', str(bw)))
            cx = x + 46
            inner += f'<circle cx="{cx}" cy="{y+h/2:.0f}" r="20" fill="rgba(255,255,255,0.18)"/>'
            inner += f'<path d="M{cx-6} {y+h/2-8:.0f} L{cx-6} {y+h/2+8:.0f} M{cx} {y+h/2-12:.0f} L{cx} {y+h/2+12:.0f} M{cx+6} {y+h/2-6:.0f} L{cx+6} {y+h/2+6:.0f}" stroke="{color}" stroke-width="3" stroke-linecap="round"/>'
            inner += f'<text x="{x+80}" y="{y+h/2+6:.0f}" font-family="{FONT}" font-size="15" fill="{color}">{esc(text)}</text>'
            inner += f'<text x="{x+bw-20}" y="{y+h-14}" text-anchor="end" font-family="{FONT}" font-size="12" fill="{muted}">{dur}</text>'
            y += h + 20
        else:
            h = 56
            inner += f'<rect x="{x}" y="{y}" width="{bw}" height="{h}" rx="16" fill="{fill}" stroke="{stroke}"/>'
            inner += f'<text x="{x+22}" y="{y+h/2+6:.0f}" font-family="{FONT}" font-size="15" fill="{color}">{esc(text)}</text>'
            y += h + 20
        inner += f'<text x="{x if not mine else x+bw}" y="{y-4}" text-anchor="{"start" if not mine else "end"}" font-family="{FONT}" font-size="12" fill="{MUTED}">{time}</text>'
        y += 14
    return frame(inner, 'Voxer voice and text thread')


def notion_hub():
    inner = (
        f'<text x="80" y="130" font-family="{FONT}" font-size="30" font-weight="700" fill="{TXT}">&#128203; Build log</text>'
        f'<text x="80" y="162" font-family="{FONT}" font-size="15" fill="{MUTED}">Every call and every ship, logged the same day.</text>'
    )
    cols = ['Date', 'Session', 'Shipped', 'Status']
    xs = [80, 260, 560, 1180]
    y0 = 220
    for c, x in zip(cols, xs):
        inner += f'<text x="{x}" y="{y0}" font-family="{FONT}" font-size="14" font-weight="700" letter-spacing="1" fill="{MUTED}">{c.upper()}</text>'
    inner += f'<line x1="80" y1="{y0+16}" x2="1520" y2="{y0+16}" stroke="{LINE}"/>'
    rows = [
        ('11 Jul', 'Kickoff & intake review', 'Automated invoice reminders', 'Live'),
        ('25 Jul', 'Working session 1', 'Overdue-invoice trigger + Slack alert', 'Live'),
        ('08 Aug', 'Working session 2', 'Supplier reconciliation bot', 'In review'),
        ('22 Aug', 'Working session 3', 'Weekly ops digest email', 'Planned'),
    ]
    y = y0 + 50
    for date, sess, ship, status in rows:
        inner += f'<text x="80" y="{y}" font-family="{FONT}" font-size="15" fill="{TXT}">{date}</text>'
        inner += f'<text x="260" y="{y}" font-family="{FONT}" font-size="15" fill="{TXT}">{esc(sess)}</text>'
        inner += f'<text x="560" y="{y}" font-family="{FONT}" font-size="15" fill="{MUTED}">{esc(clip(ship, 42))}</text>'
        col = GOOD if status == 'Live' else (PRIMARY if status == 'In review' else MUTED)
        inner += (f'<rect x="1180" y="{y-22}" width="{28+len(status)*9}" height="30" rx="15" fill="{col}" fill-opacity="0.16"/>'
                   f'<text x="1194" y="{y}" font-family="{FONT}" font-size="14" font-weight="600" fill="{col}">{status}</text>')
        y += 56
        inner += f'<line x1="80" y1="{y-32}" x2="1520" y2="{y-32}" stroke="{LINE}" stroke-opacity="0.6"/>'
    return frame(inner, 'Notion documentation hub')


PAGES = {
    'concierge-01-questionnaire': intake_form,
    'concierge-02-strategy-calls': booking,
    'concierge-03-voxer': voxer,
    'concierge-04-notion': notion_hub,
}


def main():
    for name, builder in PAGES.items():
        svg = builder()
        out = OUT / f'{name}.svg'
        out.write_text(svg, encoding='utf-8')
        print(f'  {name}.svg  {len(svg)/1024:.1f} KB')


if __name__ == '__main__':
    main()
