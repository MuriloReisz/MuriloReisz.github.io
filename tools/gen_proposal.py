#!/usr/bin/env python3
"""
Generate the six missing/placeholder images in the /services "how we work
together" timeline: the downloadable project-brief template, the greyscale
wireframe board, and the four final-delivery dashboard screenshots.

Three of these six were casualties of an earlier cleanup pass that assumed
they were unused; they were not. All six were, even before that, the same
generic grey "Dashboard" / "Insight" placeholder — never actually designed.

Ships as plain .svg (rendered directly by the browser, no rasterisation).

Run:  python3 tools/gen_proposal.py
"""

from pathlib import Path
from gen_dashboards import CANVAS, PARCH, INK, INK48, HAIR, PRIMARY, RAMP, FONT, esc, clip

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/images'
GOOD, BAD = '#1f7a44', '#b5342b'


# ============================================================ 1. project brief
# Light, document-like template (Excel/Sheets register), shown uncropped.

def spec_brief():
    W, H = 1200, 780
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Analytics Project Brief template">',
         f'<rect width="{W}" height="{H}" fill="{CANVAS}"/>',
         f'<rect x="0" y="0" width="{W}" height="88" fill="{PARCH}"/>',
         f'<line x1="0" y1="88" x2="{W}" y2="88" stroke="{HAIR}"/>',
         f'<text x="40" y="44" font-family="{FONT}" font-size="15" font-weight="700" letter-spacing="2" fill="{PRIMARY}">ANALYTICS PROJECT BRIEF</text>',
         f'<text x="40" y="68" font-family="{FONT}" font-size="14" fill="{INK48}">Fill in before the discovery call — five minutes, so we start on the real objective.</text>']

    def field(x, y, w, label, value, h=56):
        return (f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="13" font-weight="600" letter-spacing="0.5" '
                f'fill="{INK48}">{esc(label.upper())}</text>'
                f'<rect x="{x}" y="{y+12}" width="{w}" height="{h}" rx="8" fill="{PARCH}" stroke="{HAIR}"/>'
                f'<text x="{x+16}" y="{y+12+h/2+6:.0f}" font-family="{FONT}" font-size="16" fill="{INK}">{esc(value)}</text>')

    o.append(field(40, 130, 520, 'Company name', 'Ardmore Timber & Panel'))
    o.append(field(600, 130, 520, 'Primary objective', 'One trusted view of monthly sales'))

    o.append(f'<text x="40" y="240" font-family="{FONT}" font-size="13" font-weight="600" letter-spacing="0.5" fill="{INK48}">DATA SOURCES</text>')
    sources = [('Spreadsheets', True), ('CRM', True), ('Accounting package', True), ('Database', False), ('Other', False)]
    for i, (lab, checked) in enumerate(sources):
        x = 40 + i * 224
        o.append(f'<rect x="{x}" y="256" width="20" height="20" rx="5" fill="{PRIMARY if checked else CANVAS}" stroke="{PRIMARY if checked else HAIR}"/>')
        if checked:
            o.append(f'<path d="M{x+4} 266 L{x+9} 271 L{x+16} 261" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
        o.append(f'<text x="{x+28}" y="271" font-family="{FONT}" font-size="14" fill="{INK}">{esc(lab)}</text>')

    o.append(f'<text x="40" y="340" font-family="{FONT}" font-size="13" font-weight="600" letter-spacing="0.5" fill="{INK48}">KPIS TO TRACK</text>')
    kpis = ['Revenue by month', 'Margin by product line', 'Top customers', 'Stock turnover']
    for i, kpi in enumerate(kpis):
        y = 366 + i * 34
        o.append(f'<circle cx="50" cy="{y-5}" r="3.5" fill="{PRIMARY}"/>')
        o.append(f'<text x="66" y="{y}" font-family="{FONT}" font-size="15" fill="{INK}">{esc(kpi)}</text>')

    o.append(field(600, 340, 250, 'Timeline', '6–8 weeks', h=48))
    o.append(field(600, 420, 250, 'Budget range', '€8,000–12,000', h=48))

    o.append(f'<line x1="40" y1="{H-70}" x2="{W-40}" y2="{H-70}" stroke="{HAIR}"/>')
    o.append(f'<text x="40" y="{H-38}" font-family="{FONT}" font-size="13" fill="{INK48}">Prepared for the discovery call · Murilo Reis, Data &amp; AI</text>')
    o.append('</svg>')
    return '\n'.join(o)


# ============================================================ 2. wireframe board
# Deliberately greyscale/schematic — that IS what a wireframe looks like.

def wireframe_board():
    W, H = 1680, 820
    LINE = '#c7c7cc'
    BOXBG = '#f0f0f2'
    LABEL = '#8a8a90'
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="Wireframe board: Overview and Top Performers tabs">',
         f'<rect width="{W}" height="{H}" fill="#e9e9eb"/>']

    def tab_frame(x0, title):
        w = 780
        parts = [f'<rect x="{x0}" y="30" width="{w}" height="{H-60}" fill="#ffffff" stroke="{LINE}" stroke-width="1.5"/>',
                  f'<rect x="{x0}" y="30" width="{w}" height="52" fill="{BOXBG}" stroke="{LINE}"/>']
        for i, t in enumerate(['Overview', 'Top performers', 'Segments']):
            tx = x0 + 24 + i * 130
            active = t == title
            parts.append(f'<rect x="{tx}" y="42" width="112" height="28" rx="6" fill="{"#d7d7e6" if active else "none"}" stroke="{LINE if not active else "none"}"/>')
            parts.append(f'<text x="{tx+56}" y="60" text-anchor="middle" font-family="{FONT}" font-size="12" fill="{LABEL}">{esc(t)}</text>')
        return w, parts

    for col, title in enumerate(['Overview', 'Top performers']):
        x0 = 40 + col * 840
        w, parts = tab_frame(x0, title)
        o += parts
        # KPI card row
        for i in range(3):
            cx = x0 + 24 + i * 250
            o.append(f'<rect x="{cx}" y="106" width="230" height="90" fill="{BOXBG}" stroke="{LINE}" stroke-dasharray="4 4"/>')
            o.append(f'<text x="{cx+115}" y="156" text-anchor="middle" font-family="{FONT}" font-size="12" fill="{LABEL}">KPI card</text>')
        # main chart placeholder
        o.append(f'<rect x="{x0+24}" y="222" width="{w-48}" height="300" fill="{BOXBG}" stroke="{LINE}" stroke-dasharray="4 4"/>')
        if title == 'Overview':
            o.append(f'<text x="{x0+24+ (w-48)/2:.0f}" y="376" text-anchor="middle" font-family="{FONT}" font-size="13" fill="{LABEL}">World traffic map</text>')
        else:
            for b in range(6):
                bx = x0 + 60 + b * 108
                bh = 60 + (b % 4) * 45
                o.append(f'<rect x="{bx}" y="{506-bh}" width="70" height="{bh}" fill="#dcdce2" stroke="{LINE}"/>')
            o.append(f'<text x="{x0+24+(w-48)/2:.0f}" y="546" text-anchor="middle" font-family="{FONT}" font-size="13" fill="{LABEL}">Bar chart</text>')
        # table placeholder
        o.append(f'<rect x="{x0+24}" y="546" width="{w-48}" height="180" fill="{BOXBG}" stroke="{LINE}" stroke-dasharray="4 4"/>')
        for r in range(4):
            ry = 578 + r * 36
            o.append(f'<line x1="{x0+44}" y1="{ry}" x2="{x0+w-44}" y2="{ry}" stroke="{LINE}"/>')
        o.append(f'<text x="{x0+24+(w-48)/2:.0f}" y="742" text-anchor="middle" font-family="{FONT}" font-size="13" fill="{LABEL}">Table</text>')

    o.append('</svg>')
    return '\n'.join(o)


# ============================================================ shared: dashboard chrome for the 4 delivery shots

W2, H2 = 1400, 800


def dash_frame(eyebrow, title, sub, inner, live=True):
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W2}" height="{H2}" viewBox="0 0 {W2} {H2}" role="img" aria-label="{esc(title)}">',
         f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8f8fb"/><stop offset="1" stop-color="{PARCH}"/></linearGradient></defs>',
         f'<rect width="{W2}" height="{H2}" fill="url(#bg)"/>',
         f'<rect x="0" y="0" width="{W2}" height="52" fill="{CANVAS}"/>',
         f'<line x1="0" y1="52" x2="{W2}" y2="52" stroke="{HAIR}"/>']
    o += [f'<circle cx="{28+i*22}" cy="26" r="6.5" fill="{c}"/>' for i, c in enumerate(['#ff5f57', '#febc2e', '#28c840'])]
    o.append(f'<text x="112" y="32" font-family="{FONT}" font-size="15" fill="{INK48}">{esc(eyebrow)} · internal</text>')
    o.append(f'<text x="44" y="98" font-family="{FONT}" font-size="26" font-weight="700" letter-spacing="-0.6" fill="{INK}">{esc(title)}</text>')
    o.append(f'<text x="44" y="126" font-family="{FONT}" font-size="15" fill="{INK48}">{esc(sub)}</text>')
    if live:
        o.append(f'<rect x="{W2-172}" y="66" width="128" height="36" rx="18" fill="{CANVAS}" stroke="{HAIR}"/>')
        o.append(f'<circle cx="{W2-148}" cy="84" r="5" fill="#28c840"/>')
        o.append(f'<text x="{W2-134}" y="89" font-family="{FONT}" font-size="14" fill="{INK48}">Live data</text>')
    o.append(inner)
    o.append('</svg>')
    return '\n'.join(o)


def kpi_row(items, y=156):
    cw, gap, x0 = (W2 - 88 - 2 * 20) / 3, 20, 44
    parts = []
    for i, (val, lab) in enumerate(items):
        x = x0 + i * (cw + gap)
        parts.append(f'<rect x="{x:.0f}" y="{y}" width="{cw:.0f}" height="88" rx="12" fill="{CANVAS}" stroke="{HAIR}"/>')
        parts.append(f'<rect x="{x:.0f}" y="{y}" width="40" height="4" rx="2" fill="{PRIMARY}"/>')
        parts.append(f'<text x="{x+20:.0f}" y="{y+34}" font-family="{FONT}" font-size="14" fill="{INK48}">{esc(lab)}</text>')
        parts.append(f'<text x="{x+20:.0f}" y="{y+68}" font-family="{FONT}" font-size="28" font-weight="700" letter-spacing="-0.8" fill="{PRIMARY}">{esc(val)}</text>')
    return ''.join(parts)


def donut(cx, cy, r, data, center_label):
    import math
    total = sum(v for _, v in data)
    a0 = -90.0
    parts = []
    for i, (lab, v) in enumerate(data):
        frac = v / total
        a1 = a0 + frac * 360
        large = 1 if (a1 - a0) > 180 else 0
        x0p, y0p = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
        x1p, y1p = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
        parts.append(f'<path d="M{cx} {cy} L{x0p:.1f} {y0p:.1f} A{r} {r} 0 {large} 1 {x1p:.1f} {y1p:.1f} Z" fill="{RAMP[i % len(RAMP)]}"/>')
        a0 = a1
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.58:.0f}" fill="{CANVAS}"/>')
    parts.append(f'<text x="{cx}" y="{cy+6}" text-anchor="middle" font-family="{FONT}" font-size="15" fill="{INK48}">{esc(center_label)}</text>')
    ly = cy - r
    for i, (lab, v) in enumerate(data):
        parts.append(f'<rect x="{cx+r+40}" y="{ly+i*30:.0f}" width="13" height="13" rx="3" fill="{RAMP[i % len(RAMP)]}"/>')
        parts.append(f'<text x="{cx+r+60}" y="{ly+i*30+11:.0f}" font-family="{FONT}" font-size="14" fill="{INK}">{esc(lab)} — {v:.0f}%</text>')
    return ''.join(parts)


def bars(x, y, w, h, series):
    hi = max(v for _, v in series) or 1
    n = len(series)
    gap = 12
    bw = (w - gap * (n - 1)) / n
    parts = []
    for i in range(4):
        gy = y + h - (h * i / 3)
        parts.append(f'<line x1="{x}" y1="{gy:.1f}" x2="{x+w}" y2="{gy:.1f}" stroke="{HAIR}" stroke-dasharray="{"0" if i==0 else "3 5"}"/>')
    for i, (lab, v) in enumerate(series):
        bh = (v / hi) * h
        bx = x + i * (bw + gap)
        parts.append(f'<rect x="{bx:.1f}" y="{y+h-bh:.1f}" width="{bw:.1f}" height="{bh:.1f}" rx="6" fill="{RAMP[0] if i == n-1 else RAMP[2]}"/>')
        parts.append(f'<text x="{bx+bw/2:.1f}" y="{y+h+24:.0f}" text-anchor="middle" font-family="{FONT}" font-size="13" fill="{INK48}">{esc(clip(lab,10))}</text>')
    return ''.join(parts)


def ranked_table(x, y, w, headers, rows, widths):
    parts = []
    xs = []
    xc = x
    for wd in widths:
        xs.append(xc); xc += wd
    for h_, xh in zip(headers, xs):
        parts.append(f'<text x="{xh}" y="{y}" font-family="{FONT}" font-size="13" font-weight="700" letter-spacing="0.5" fill="{INK48}">{h_.upper()}</text>')
    parts.append(f'<line x1="{x}" y1="{y+12}" x2="{x+w}" y2="{y+12}" stroke="{HAIR}"/>')
    rh = 40
    for r, row in enumerate(rows):
        ry = y + 12 + r * rh
        if r % 2 == 1:
            parts.append(f'<rect x="{x}" y="{ry}" width="{w}" height="{rh}" fill="{PARCH}" fill-opacity="0.5"/>')
        for val, xv in zip(row, xs):
            parts.append(f'<text x="{xv}" y="{ry+rh/2+5:.0f}" font-family="{FONT}" font-size="14" fill="{INK}">{esc(clip(val, 30))}</text>')
    return ''.join(parts)


# ============================================================ 3. overview

def overview():
    inner = kpi_row([('48,200', 'Total sessions'), ('3m 42s', 'Avg. session duration'), ('192k', 'Pageviews')])
    inner += donut(240, 430, 130, [('Mobile', 54), ('Desktop', 37), ('Tablet', 9)], 'By device')
    inner += bars(620, 300, 720, 220, [('Search', 38), ('Social', 24), ('Direct', 19), ('Referral', 12), ('Email', 7)])
    inner += f'<text x="620" y="272" font-family="{FONT}" font-size="15" font-weight="600" fill="{INK}">Sessions by channel (%)</text>'
    return dash_frame('Marketing performance', 'Overview', 'Sessions, engagement and channel mix this month', inner)


def top_performers():
    inner = kpi_row([('+18%', 'Sessions vs. last 12mo'), ('+9%', 'Avg. duration vs. last 12mo'), ('+22%', 'Pageviews vs. last 12mo')])
    inner += ranked_table(44, 296, 1312,
        ['Referral source', 'Sessions', 'Avg. duration', 'Pageviews'],
        [
            ['google.com', '14,820', '4m 10s', '61,200'],
            ['instagram.com', '9,340', '2m 55s', '28,900'],
            ['facebook.com', '6,110', '2m 20s', '17,400'],
            ['newsletter', '4,780', '5m 05s', '22,100'],
            ['partner-blog.ie', '2,960', '3m 30s', '9,800'],
        ], [420, 300, 300, 292])
    return dash_frame('Marketing performance', 'Top performers', 'Twelve-month trend and the sources doing the work', inner)


def insights_customers():
    inner = kpi_row([('€312k', 'Christmas sales'), ('18,400', 'Units sold'), ('€97k', 'Profit')])
    inner += donut(240, 430, 130, [('Returning', 61), ('New', 28), ('Gift buyers', 11)], 'By segment')
    inner += bars(620, 300, 720, 220, [('Toys', 34), ('Decor', 27), ('Food & Panel_PLACEHOLDER', 21), ('Apparel', 12), ('Other', 6)])
    inner += f'<text x="620" y="272" font-family="{FONT}" font-size="15" font-weight="600" fill="{INK}">Best-selling categories (% of sales)</text>'
    return dash_frame('Christmas sales analysis', 'Customer segments', 'Who bought, and what drove the profit', inner)


def insights_pricing():
    inner = kpi_row([('€24.80', 'Avg. unit price'), ('1.9', 'Avg. units per order'), ('Fri 6–8pm', 'Peak shopping window')])
    # scatter: unit price vs quantity
    sx, sy, sw, sh = 44, 300, 620, 240
    inner += f'<text x="{sx}" y="272" font-family="{FONT}" font-size="15" font-weight="600" fill="{INK}">Unit price vs. quantity per order</text>'
    inner += f'<line x1="{sx}" y1="{sy+sh}" x2="{sx+sw}" y2="{sy+sh}" stroke="{HAIR}"/><line x1="{sx}" y1="{sy}" x2="{sx}" y2="{sy+sh}" stroke="{HAIR}"/>'
    import random as _r
    pts = [(0.15+0.7*((i*37)%97)/97, 0.15+0.7*((i*53)%89)/89) for i in range(46)]
    for px, py in pts:
        inner += f'<circle cx="{sx+px*sw:.1f}" cy="{sy+sh-py*sh:.1f}" r="5" fill="{PRIMARY}" fill-opacity="0.5"/>'
    inner += f'<text x="{sx}" y="{sy+sh+26}" font-family="{FONT}" font-size="12" fill="{INK48}">Quantity &#8594;</text>'
    # heatmap by day/hour
    hx, hy = 780, 300
    inner += f'<text x="{hx}" y="272" font-family="{FONT}" font-size="15" font-weight="600" fill="{INK}">Shopping activity by day &amp; hour</text>'
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    hours = list(range(8, 22, 2))
    cell = 44
    for d, day in enumerate(days):
        inner += f'<text x="{hx-10}" y="{hy+d*cell+cell/2+5:.0f}" text-anchor="end" font-family="{FONT}" font-size="12" fill="{INK48}">{day}</text>'
        for h, hr in enumerate(hours):
            v = 0.15 + 0.75 * (((d * 7 + h * 3) % 11) / 10) * (1.6 if day == 'Fri' and hr >= 18 else 1)
            v = min(v, 1)
            inner += f'<rect x="{hx+h*cell:.0f}" y="{hy+d*cell:.0f}" width="{cell-4}" height="{cell-4}" rx="4" fill="{PRIMARY}" fill-opacity="{v:.2f}"/>'
    for h, hr in enumerate(hours):
        inner += f'<text x="{hx+h*cell+cell/2-2:.0f}" y="{hy-10}" text-anchor="middle" font-family="{FONT}" font-size="11" fill="{INK48}">{hr}:00</text>'
    return dash_frame('Christmas sales analysis', 'Pricing and promotion', 'Where price, volume and timing meet', inner)


PAGES = {
    'proposal-spec': spec_brief,
    'proposal-wireframe': wireframe_board,
    'proposal-overview': overview,
    'proposal-top-performers': top_performers,
    'proposal-insights-1': insights_customers,
    'proposal-insights-2': insights_pricing,
}


def main():
    for name, builder in PAGES.items():
        svg = builder()
        out = OUT / f'{name}.svg'
        out.write_text(svg, encoding='utf-8')
        print(f'  {name}.svg  {len(svg)/1024:.1f} KB')


if __name__ == '__main__':
    main()
