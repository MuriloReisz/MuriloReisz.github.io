#!/usr/bin/env python3
"""
Generate the 9-page "AI Tools Assessment" sample report preview used in the
carousel on /ai-services. These ship as plain .svg (the browser renders them
directly, no rasterisation needed) sized 1400x800 to match how
`.cs-gallery__media` actually displays them (aspect-ratio: 7/4, object-fit:
cover) — the old placeholders were 1240x1750 portraits getting cropped into
a landscape frame.

Run:  python3 tools/gen_report.py
"""

from pathlib import Path
from gen_dashboards import CANVAS, PARCH, INK, INK48, HAIR, PRIMARY, RAMP, FONT, esc, clip

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/images'
W, H = 1400, 800
GOOD, BAD = '#1f7a44', '#b5342b'
DARK = '#0f0f13'


def footer(n: int, dark=False) -> str:
    col = '#ffffff' if dark else INK48
    op = '0.55' if dark else '1'
    return (
        f'<g opacity="{op}">'
        f'<circle cx="52" cy="{H-40}" r="4" fill="{PRIMARY}"/>'
        f'<text x="66" y="{H-36}" font-family="{FONT}" font-size="13" fill="{col}">Murilo Reis &#183; AI Tools Assessment</text>'
        f'<text x="{W-52}" y="{H-36}" text-anchor="end" font-family="{FONT}" font-size="13" fill="{col}">{n} / 9</text>'
        f'</g>'
    )


def header(eyebrow: str, title: str) -> str:
    return (
        f'<text x="70" y="86" font-family="{FONT}" font-size="15" font-weight="700" '
        f'letter-spacing="2" fill="{PRIMARY}">{esc(eyebrow.upper())}</text>'
        f'<text x="70" y="138" font-family="{FONT}" font-size="38" font-weight="700" '
        f'letter-spacing="-1" fill="{INK}">{esc(title)}</text>'
    )


def page(n, inner, bg=CANVAS, dark=False):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        f'<rect width="{W}" height="{H}" fill="{bg}"/>{inner}{footer(n, dark)}</svg>'
    )


# ---------------------------------------------------------------- page 1: cover

def cover():
    inner = f'''
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#241f4a"/><stop offset="1" stop-color="#0c0b16"/>
      </linearGradient>
      <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6d5ef0"/><stop offset="1" stop-color="#4a3fd0"/>
      </linearGradient>
    </defs>
    <rect width="{W}" height="{H}" fill="url(#cg)"/>
    <rect x="70" y="64" width="64" height="64" rx="15" fill="url(#badge)"/>
    <path d="M82 96 L92 76 L99 88 L108 76" fill="none" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="70" y="220" font-family="{FONT}" font-size="16" font-weight="700" letter-spacing="3" fill="#a78bfa">AI TOOLS ASSESSMENT</text>
    <text x="70" y="286" font-family="{FONT}" font-size="52" font-weight="700" letter-spacing="-1.4" fill="#ffffff">Your AI Tools Assessment</text>
    <text x="70" y="332" font-family="{FONT}" font-size="21" fill="#c9c5e0">Where the hours are going, and what gets them back.</text>
    <line x1="70" y1="400" x2="380" y2="400" stroke="#3a3560" stroke-width="1.4"/>
    <text x="70" y="446" font-family="{FONT}" font-size="15" fill="#8f8ab8">Prepared for</text>
    <text x="70" y="474" font-family="{FONT}" font-size="19" font-weight="600" fill="#ffffff">Your business name</text>
    <text x="70" y="520" font-family="{FONT}" font-size="15" fill="#8f8ab8">Prepared by</text>
    <text x="70" y="548" font-family="{FONT}" font-size="19" font-weight="600" fill="#ffffff">Murilo Reis &#183; Data &amp; AI</text>
    '''
    return page(1, inner, bg=DARK, dark=True)


# ---------------------------------------------------------------- page 2: executive summary

def exec_summary():
    cards = [
        ('The problem', 'Four repeatable jobs — enquiries, scheduling, follow-ups, reporting — are eating a working day a week per person, spread thin enough that nobody has stopped to fix it.'),
        ('The opportunity', 'Three off-the-shelf tools, right-sized to your team, cover all four jobs without a custom build or an enterprise contract.'),
        ('The recommendation', 'Start with the two quickest wins in week one, add the third once the team trusts the first two.'),
    ]
    y = 200
    inner = header('Executive summary', 'Where this report is going')
    stats = [('18h', 'reclaimed per week'), ('3', 'tools recommended'), ('&lt; 6 wks', 'to payback')]
    for i, (val, lab) in enumerate(stats):
        x = 70 + i * 210
        inner += (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="40" font-weight="700" '
                   f'letter-spacing="-1" fill="{PRIMARY}">{val}</text>'
                   f'<text x="{x}" y="{y+26}" font-family="{FONT}" font-size="14" fill="{INK48}">{esc(lab)}</text>')
    cy = 300
    for title, body in cards:
        inner += (f'<line x1="70" y1="{cy}" x2="1330" y2="{cy}" stroke="{HAIR}"/>'
                   f'<text x="70" y="{cy+34}" font-family="{FONT}" font-size="17" font-weight="700" fill="{INK}">{esc(title)}</text>'
                   f'<text x="330" y="{cy+34}" font-family="{FONT}" font-size="15.5" fill="{INK48}">'
                   f'<tspan x="330" dy="0">{esc(clip(body, 92))}</tspan></text>')
        cy += 88
    return page(2, inner)


# ---------------------------------------------------------------- page 3: financial impact

def financial_impact():
    inner = header('Financial impact', 'The ROI, in your numbers')
    stats = [('72h', 'reclaimed / month'), ('€2,860', 'monthly value of that time'), ('5.4 wks', 'to pay back the tools')]
    for i, (val, lab) in enumerate(stats):
        x = 70 + i * 330
        inner += (f'<rect x="{x}" y="180" width="290" height="110" rx="14" fill="{PARCH}"/>'
                   f'<text x="{x+24}" y="240" font-family="{FONT}" font-size="34" font-weight="700" '
                   f'letter-spacing="-1" fill="{PRIMARY}">{val}</text>'
                   f'<text x="{x+24}" y="270" font-family="{FONT}" font-size="14" fill="{INK48}">{esc(lab)}</text>')
    # cost-of-manual-work vs cost-of-tools crossover line chart
    x0, y0, w, h = 90, 620, 1220, 220
    inner += f'<text x="{x0}" y="{y0-h-30}" font-family="{FONT}" font-size="15" fill="{INK48}">Cumulative cost — manual effort vs. tool spend</text>'
    manual = [0, 480, 960, 1440, 1920, 2400]
    tools = [180, 360, 540, 720, 900, 1080]
    n = len(manual)
    hi = max(manual + tools) * 1.1
    px = lambda i: x0 + (w * i / (n - 1))
    py = lambda v: y0 - (v / hi) * h
    for i in range(4):
        gy = y0 - h * i / 3
        inner += f'<line x1="{x0}" y1="{gy:.1f}" x2="{x0+w}" y2="{gy:.1f}" stroke="{HAIR}" stroke-dasharray="{"0" if i==0 else "3 5"}"/>'
    dm = 'M ' + ' L '.join(f'{px(i):.1f} {py(v):.1f}' for i, v in enumerate(manual))
    dt = 'M ' + ' L '.join(f'{px(i):.1f} {py(v):.1f}' for i, v in enumerate(tools))
    inner += f'<path d="{dm}" fill="none" stroke="{BAD}" stroke-width="3.2" stroke-linecap="round"/>'
    inner += f'<path d="{dt}" fill="none" stroke="{GOOD}" stroke-width="3.2" stroke-linecap="round"/>'
    for i, m in enumerate(['M1', 'M2', 'M3', 'M4', 'M5', 'M6']):
        inner += f'<text x="{px(i):.1f}" y="{y0+28}" text-anchor="middle" font-family="{FONT}" font-size="13" fill="{INK48}">{m}</text>'
    inner += (f'<rect x="{x0}" y="{y0-h-64}" width="14" height="14" rx="3" fill="{BAD}"/>'
               f'<text x="{x0+22}" y="{y0-h-52}" font-family="{FONT}" font-size="14" fill="{INK48}">Cost of the manual process</text>'
               f'<rect x="{x0+260}" y="{y0-h-64}" width="14" height="14" rx="3" fill="{GOOD}"/>'
               f'<text x="{x0+282}" y="{y0-h-52}" font-family="{FONT}" font-size="14" fill="{INK48}">Cost of the recommended tools</text>')
    return page(3, inner)


# ---------------------------------------------------------------- page 4: impact/effort matrix

def impact_effort():
    inner = header('Impact vs. effort', 'Where to spend the first week')
    x0, y0, size = 220, 660, 520
    inner += (f'<line x1="{x0}" y1="{y0-size}" x2="{x0}" y2="{y0}" stroke="{INK48}"/>'
               f'<line x1="{x0}" y1="{y0}" x2="{x0+size}" y2="{y0}" stroke="{INK48}"/>'
               f'<line x1="{x0+size/2}" y1="{y0-size}" x2="{x0+size/2}" y2="{y0}" stroke="{HAIR}" stroke-dasharray="3 6"/>'
               f'<line x1="{x0}" y1="{y0-size/2}" x2="{x0+size}" y2="{y0-size/2}" stroke="{HAIR}" stroke-dasharray="3 6"/>'
               f'<text x="{x0+size/2}" y="{y0+36}" text-anchor="middle" font-family="{FONT}" font-size="15" fill="{INK48}">Effort to set up &#8594;</text>'
               f'<text x="{x0-40}" y="{y0-size/2}" text-anchor="middle" font-family="{FONT}" font-size="15" fill="{INK48}" '
               f'transform="rotate(-90 {x0-40} {y0-size/2})">Impact &#8594;</text>')
    quads = [('Quick wins', x0+10, y0-size+30), ('Big bets', x0+size/2+10, y0-size+30),
              ('Fill-ins', x0+10, y0-30), ('Question marks', x0+size/2+10, y0-30)]
    for lab, qx, qy in quads:
        inner += f'<text x="{qx}" y="{qy}" font-family="{FONT}" font-size="13" font-weight="600" letter-spacing="0.5" fill="{PRIMARY}">{esc(lab.upper())}</text>'
    dots = [
        ('Inbox triage', 0.18, 0.82), ('Meeting notes', 0.14, 0.66), ('Booking assistant', 0.32, 0.74),
        ('Reporting pack', 0.7, 0.62), ('CRM cleanup', 0.62, 0.3), ('Custom chatbot', 0.82, 0.86),
    ]
    for lab, ex, ey in dots:
        cx, cy = x0 + ex * size, y0 - ey * size
        inner += (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="8" fill="{RAMP[0]}" fill-opacity="0.85"/>'
                   f'<text x="{cx+14:.1f}" y="{cy+5:.1f}" font-family="{FONT}" font-size="14" fill="{INK}">{esc(lab)}</text>')
    return page(4, inner)


# ---------------------------------------------------------------- page 5: quick wins

def quick_wins():
    inner = header('Quick wins', 'One pain, one tool, one week')
    rows = [
        ('Missed calls after hours', 'AI phone attendant', '6h/wk'),
        ('Manual appointment reminders', 'Automated SMS + email flow', '4h/wk'),
        ('Rebuilding the same weekly report', 'Connected dashboard', '3h/wk'),
        ('Re-typing enquiries into the CRM', 'Inbox-to-CRM automation', '5h/wk'),
    ]
    x0, y0, w, rh, gap = 70, 180, 1260, 90, 18
    heads = ['Pain point', 'Recommended tool', 'Hours back']
    xs = [x0 + 24, x0 + 560, x0 + w - 160]
    for h_, xc in zip(heads, xs):
        inner += f'<text x="{xc}" y="{y0-16}" font-family="{FONT}" font-size="14" font-weight="700" letter-spacing="1" fill="{INK48}">{esc(h_.upper())}</text>'
    for i, (pain, tool, hrs) in enumerate(rows):
        y = y0 + i * (rh + gap)
        inner += f'<rect x="{x0}" y="{y}" width="{w}" height="{rh}" rx="12" fill="{PARCH}"/>'
        inner += f'<rect x="{x0}" y="{y}" width="6" height="{rh}" rx="3" fill="{RAMP[0]}"/>'
        inner += f'<text x="{x0+24}" y="{y+rh/2+6:.0f}" font-family="{FONT}" font-size="18" fill="{INK}">{esc(pain)}</text>'
        inner += f'<text x="{x0+560}" y="{y+rh/2+6:.0f}" font-family="{FONT}" font-size="17" fill="{INK48}">{esc(tool)}</text>'
        inner += f'<text x="{x0+w-40}" y="{y+rh/2+6:.0f}" text-anchor="end" font-family="{FONT}" font-size="19" font-weight="700" fill="{GOOD}">{esc(hrs)}</text>'
    return page(5, inner)


# ---------------------------------------------------------------- page 6: recommended solutions

def recommended_solutions():
    inner = header('Recommended solutions', 'Right-sized, not enterprise-sized')
    cards = [
        ('AI phone &amp; chat attendant', 'Answers, books and routes after hours.', '€90/mo'),
        ('Inbox-to-CRM automation', 'Every enquiry logged with zero re-typing.', '€40/mo'),
        ('Connected reporting dashboard', 'The Monday report builds itself overnight.', '€60/mo'),
    ]
    cw, gap, x0, y0, ch = 380, 30, 70, 200, 420
    for i, (title, blurb, price) in enumerate(cards):
        x = x0 + i * (cw + gap)
        inner += (f'<rect x="{x}" y="{y0}" width="{cw}" height="{ch}" rx="16" fill="{CANVAS}" stroke="{HAIR}" stroke-width="1.4"/>'
                   f'<rect x="{x+28}" y="{y0+28}" width="44" height="44" rx="10" fill="{PARCH}"/>'
                   f'<path d="M{x+40} {y0+50} L{x+48} {y0+40} L{x+56} {y0+50}" fill="none" stroke="{PRIMARY}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
                   f'<text x="{x+28}" y="{y0+110}" font-family="{FONT}" font-size="19" font-weight="700" fill="{INK}">{title}</text>'
                   f'<text x="{x+28}" y="{y0+140}" font-family="{FONT}" font-size="15" fill="{INK48}">'
                   f'<tspan x="{x+28}" dy="0">{blurb}</tspan></text>'
                   f'<text x="{x+28}" y="{y0+ch-30}" font-family="{FONT}" font-size="22" font-weight="700" fill="{PRIMARY}">{price}</text>')
    return page(6, inner)


# ---------------------------------------------------------------- page 7: 4-day quick-start plan

def quickstart():
    inner = header('Your 4-day quick-start plan', 'One small action a day')
    days = [
        ('Day 1', 'Turn on the phone attendant', 'Connect your existing number — nothing to migrate.'),
        ('Day 2', 'Wire the inbox to your CRM', 'Every new enquiry logs itself from this point on.'),
        ('Day 3', 'Point the dashboard at your data', 'Monday’s report starts building itself overnight.'),
        ('Day 4', 'Review the first automated week', 'Fifteen minutes to confirm it caught everything.'),
    ]
    x0, y0, w = 90, 150, 1220
    lx = x0 + 26
    inner += f'<line x1="{lx}" y1="{y0+10}" x2="{lx}" y2="{y0+4*140+20}" stroke="{HAIR}" stroke-width="2"/>'
    for i, (d, title, body) in enumerate(days):
        y = y0 + i * 140
        inner += (f'<circle cx="{lx}" cy="{y+30}" r="13" fill="{PRIMARY}"/>'
                   f'<text x="{lx}" y="{y+35}" text-anchor="middle" font-family="{FONT}" font-size="13" font-weight="700" fill="#ffffff">{i+1}</text>'
                   f'<text x="{lx+40}" y="{y+18}" font-family="{FONT}" font-size="14" font-weight="700" letter-spacing="1" fill="{PRIMARY}">{d.upper()}</text>'
                   f'<text x="{lx+40}" y="{y+46}" font-family="{FONT}" font-size="21" font-weight="700" fill="{INK}">{esc(title)}</text>'
                   f'<text x="{lx+40}" y="{y+74}" font-family="{FONT}" font-size="15.5" fill="{INK48}">{esc(body)}</text>')
    return page(7, inner)


# ---------------------------------------------------------------- page 8: what comes after

def what_comes_after():
    inner = header('What comes after', 'The four weeks after go-live')
    steps = [
        ('Week 1-2', 'Bed in', 'Watch the automations against real volume, tune the edge cases.'),
        ('Week 3-4', 'Hand over', 'Your team owns the day-to-day; I stay on for questions.'),
        ('Month 2', 'Second wave', 'The next two pain points from the assessment, if you want them.'),
        ('Ongoing', 'Check-in', 'A short monthly look at the numbers, not a retainer you forget about.'),
    ]
    x0, y0, w, cw = 90, 250, 1220, 270
    gap = (w - cw * len(steps)) / (len(steps) - 1)
    inner += f'<line x1="{x0+cw/2}" y1="{y0}" x2="{x0+w-cw/2}" y2="{y0}" stroke="{HAIR}" stroke-width="2"/>'
    for i, (when, title, body) in enumerate(steps):
        x = x0 + i * (cw + gap)
        cx = x + cw / 2
        inner += (f'<circle cx="{cx:.1f}" cy="{y0}" r="9" fill="{RAMP[0] if i==0 else RAMP[2]}"/>'
                   f'<text x="{cx:.1f}" y="{y0+50}" text-anchor="middle" font-family="{FONT}" font-size="14" font-weight="700" '
                   f'letter-spacing="1" fill="{PRIMARY}">{when.upper()}</text>'
                   f'<text x="{cx:.1f}" y="{y0+84}" text-anchor="middle" font-family="{FONT}" font-size="19" font-weight="700" fill="{INK}">{esc(title)}</text>')
        words = body.split(' ')
        lines, cur = [], ''
        for word in words:
            if len(cur) + len(word) > 26:
                lines.append(cur); cur = word
            else:
                cur = (cur + ' ' + word).strip()
        lines.append(cur)
        for li, line in enumerate(lines):
            inner += f'<text x="{cx:.1f}" y="{y0+114+li*22}" text-anchor="middle" font-family="{FONT}" font-size="14.5" fill="{INK48}">{esc(line)}</text>'
    return page(8, inner)


# ---------------------------------------------------------------- page 9: next steps

def next_steps():
    inner = header('Your next steps', 'Three ways to take this further')
    items = [
        'Read the report and flag anything that does not match how the team actually works',
        'Pick one quick win to start with — I recommend the phone attendant, it pays back fastest',
        'Book 30 minutes and we decide together whether you run it or I build it',
    ]
    y = 190
    for i, text in enumerate(items):
        inner += (f'<rect x="70" y="{y}" width="42" height="42" rx="10" fill="{PARCH}"/>'
                   f'<text x="91" y="{y+28}" text-anchor="middle" font-family="{FONT}" font-size="18" font-weight="700" fill="{PRIMARY}">{i+1}</text>'
                   f'<text x="132" y="{y+28}" font-family="{FONT}" font-size="17" fill="{INK}">{esc(clip(text, 78))}</text>')
        y += 76
    by = y + 40
    inner += (f'<rect x="70" y="{by}" width="1260" height="130" rx="16" fill="{INK}"/>'
               f'<text x="106" y="{by+56}" font-family="{FONT}" font-size="21" font-weight="700" fill="#ffffff">Ready when you are.</text>'
               f'<text x="106" y="{by+86}" font-family="{FONT}" font-size="15.5" fill="#c9c9cf">Book the review call and we will go through this page by page.</text>'
               f'<rect x="1000" y="{by+40}" width="220" height="50" rx="25" fill="{PRIMARY}"/>'
               f'<text x="1110" y="{by+71}" text-anchor="middle" font-family="{FONT}" font-size="15.5" font-weight="600" fill="#ffffff">Book the call ›</text>')
    return page(9, inner)


PAGES = [cover, exec_summary, financial_impact, impact_effort, quick_wins,
         recommended_solutions, quickstart, what_comes_after, next_steps]


def main():
    for i, builder in enumerate(PAGES, start=1):
        svg = builder()
        out = OUT / f'ai-report-{i:02d}.svg'
        out.write_text(svg, encoding='utf-8')
        print(f'  ai-report-{i:02d}.svg  {len(svg)/1024:.1f} KB')


if __name__ == '__main__':
    main()
