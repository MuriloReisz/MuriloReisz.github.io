#!/usr/bin/env python3
"""
Generate the two supporting "screens" images for every project's gallery,
replacing the generic grey placeholder tiles ("Project image" / "Sample
report N/9") with a bespoke chart drawn to match what the case-study
caption already says is on screen.

Same rendering path as gen_dashboards.py: SVG built in Python, rasterised
to PNG with `sips` (macOS-native, no extra dependency), only the PNG ships.

Run:  python3 tools/gen_gallery.py
"""

import subprocess
import tempfile
from pathlib import Path

from gen_dashboards import (
    CANVAS, PARCH, INK, INK48, HAIR, PRIMARY, RAMP, FONT, esc, clip,
)

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/images/gallery'

W, H = 1400, 800
GOOD, BAD = '#1f7a44', '#b5342b'


def frame(inner: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
        f'<rect width="{W}" height="{H}" fill="{CANVAS}"/>'
        f'<text x="48" y="56" font-family="{FONT}" font-size="15" font-weight="600" '
        f'letter-spacing="1.6" fill="{PRIMARY}">{esc(title.upper())}</text>'
        f'{inner}</svg>'
    )


# ---------------------------------------------------------------- primitives

def ranked_bars(items, unit='', signed=False):
    """items: [(label, value, tag)]. Horizontal bars, longest first."""
    hi = max(abs(v) for _, v, _ in items) or 1
    x0, y0, w, row_h, gap = 300, 100, 900, 74, 18
    parts = []
    for i, (label, v, tag) in enumerate(items):
        y = y0 + i * (row_h + gap)
        bw = (abs(v) / hi) * w
        color = RAMP[0] if i == 0 else RAMP[2]
        if signed:
            color = GOOD if v >= 0 else BAD
        parts.append(f'<text x="{x0-16}" y="{y+row_h/2+6:.0f}" text-anchor="end" font-family="{FONT}" '
                      f'font-size="19" fill="{INK}">{esc(clip(label, 22))}</text>')
        parts.append(f'<rect x="{x0}" y="{y}" width="{w}" height="{row_h}" rx="10" fill="{PARCH}"/>')
        parts.append(f'<rect x="{x0}" y="{y}" width="{max(bw,4):.1f}" height="{row_h}" rx="10" fill="{color}"/>')
        parts.append(f'<text x="{x0+max(bw,4)+16:.1f}" y="{y+row_h/2+6:.0f}" font-family="{FONT}" '
                      f'font-size="19" font-weight="700" fill="{INK}">{esc(str(v))}{unit}</text>')
        if tag:
            on_bar = bw >= w * 0.9
            tcol = GOOD if (tag.startswith('+') or (signed and v >= 0)) else BAD if tag.startswith('−') or tag.startswith('-') else (
                '#ffffff' if on_bar else INK48)
            parts.append(f'<text x="{x0+w-14}" y="{y+row_h/2+6:.0f}" text-anchor="end" font-family="{FONT}" '
                          f'font-size="17" font-weight="600" fill="{tcol}">{esc(tag)}</text>')
    return ''.join(parts)


def grouped_bars(categories, label_a, label_b):
    """categories: [(cat, val_a, val_b)] — two bars per category, 0-100 scale."""
    x0, y0, w, h = 90, 660, 1240, 480
    n = len(categories)
    slot = w / n
    bw = slot * 0.32
    parts = [f'<line x1="{x0}" y1="{y0}" x2="{x0+w}" y2="{y0}" stroke="{HAIR}"/>']
    parts.append(f'<rect x="{x0}" y="140" width="18" height="18" rx="4" fill="{RAMP[0]}"/>'
                 f'<text x="{x0+28}" y="154" font-family="{FONT}" font-size="17" fill="{INK48}">{esc(label_a)}</text>')
    parts.append(f'<rect x="{x0+180}" y="140" width="18" height="18" rx="4" fill="{HAIR}"/>'
                 f'<text x="{x0+208}" y="154" font-family="{FONT}" font-size="17" fill="{INK48}">{esc(label_b)}</text>')
    for i, (cat, a, b) in enumerate(categories):
        cx = x0 + i * slot + slot / 2
        ha, hb = (a / 100) * h, (b / 100) * h
        parts.append(f'<rect x="{cx-bw-4:.1f}" y="{y0-ha:.1f}" width="{bw:.1f}" height="{ha:.1f}" rx="6" fill="{RAMP[0]}"/>')
        parts.append(f'<rect x="{cx+4:.1f}" y="{y0-hb:.1f}" width="{bw:.1f}" height="{hb:.1f}" rx="6" fill="{HAIR}"/>')
        parts.append(f'<text x="{cx:.1f}" y="{y0-ha-14:.1f}" text-anchor="middle" font-family="{FONT}" '
                     f'font-size="17" font-weight="700" fill="{RAMP[0]}">{a:.0f}</text>')
        parts.append(f'<text x="{cx:.1f}" y="{y0+34:.0f}" text-anchor="middle" font-family="{FONT}" '
                     f'font-size="17" fill="{INK48}">{esc(clip(cat, 12))}</text>')
    return ''.join(parts)


def table(headers, rows, widths):
    x0, y0, row_h = 60, 110, 62
    parts = []
    x = x0
    xs = []
    for wd in widths:
        xs.append(x)
        x += wd
    for hcol, xc in zip(headers, xs):
        parts.append(f'<text x="{xc}" y="{y0-20}" font-family="{FONT}" font-size="15" font-weight="700" '
                     f'letter-spacing="1" fill="{INK48}">{esc(hcol.upper())}</text>')
    parts.append(f'<line x1="{x0}" y1="{y0}" x2="{x0+sum(widths)}" y2="{y0}" stroke="{HAIR}"/>')
    for r, row in enumerate(rows):
        y = y0 + r * row_h
        if r % 2 == 1:
            parts.append(f'<rect x="{x0}" y="{y}" width="{sum(widths)}" height="{row_h}" fill="{PARCH}" fill-opacity="0.5"/>')
        for val, xc in zip(row, xs):
            color = INK
            if val.startswith('Break') or val.startswith('Yes') or val.startswith('Sent'):
                color = BAD
            elif val.startswith('Matched') or val.startswith('Confirmed') or val.startswith('No'):
                color = GOOD
            parts.append(f'<text x="{xc}" y="{y+row_h/2+6:.0f}" font-family="{FONT}" font-size="17" '
                         f'fill="{color}">{esc(clip(val, 34))}</text>')
        parts.append(f'<line x1="{x0}" y1="{y+row_h}" x2="{x0+sum(widths)}" y2="{y+row_h}" stroke="{HAIR}" stroke-width="0.6"/>')
    return ''.join(parts)


def line_band(series, band_lo, band_hi, anom_start, anom_label):
    x0, y0, w, h = 90, 660, 1220, 480
    vals = [v for _, v in series]
    hi, lo = max(vals + [band_hi]) * 1.08, min(vals + [band_lo]) * 0.92
    span = hi - lo
    n = len(series)
    px = lambda i: x0 + (w * i / (n - 1))
    py = lambda v: y0 - ((v - lo) / span) * h
    parts = []
    for i in range(5):
        gy = y0 - h * i / 4
        parts.append(f'<line x1="{x0}" y1="{gy:.1f}" x2="{x0+w}" y2="{gy:.1f}" stroke="{HAIR}" stroke-dasharray="{"0" if i==0 else "3 5"}"/>')
        parts.append(f'<text x="{x0-14}" y="{gy+5:.1f}" text-anchor="end" font-family="{FONT}" font-size="15" fill="{INK48}">{lo+span*i/4:.0f}</text>')
    by0, by1 = py(band_hi), py(band_lo)
    parts.append(f'<rect x="{x0}" y="{by0:.1f}" width="{w}" height="{by1-by0:.1f}" fill="{RAMP[3]}" fill-opacity="0.35"/>')
    ax0 = px(anom_start)
    parts.append(f'<rect x="{ax0:.1f}" y="0" width="{x0+w-ax0:.1f}" height="{H}" fill="{BAD}" fill-opacity="0.07"/>')
    parts.append(f'<text x="{ax0+12:.1f}" y="130" font-family="{FONT}" font-size="16" font-weight="600" fill="{BAD}">{esc(anom_label)}</text>')
    pts = [(px(i), py(v)) for i, (_, v) in enumerate(series)]
    d = 'M ' + ' L '.join(f'{a:.1f} {b:.1f}' for a, b in pts)
    parts.append(f'<path d="{d}" fill="none" stroke="{RAMP[0]}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>')
    for i, (a, b) in enumerate(pts):
        parts.append(f'<circle cx="{a:.1f}" cy="{b:.1f}" r="4" fill="{CANVAS}" stroke="{RAMP[0]}" stroke-width="2.4"/>')
    step = max(1, n // 7)
    for i, (lab, _) in enumerate(series):
        if i % step == 0 or i == n - 1:
            parts.append(f'<text x="{px(i):.1f}" y="{y0+30}" text-anchor="middle" font-family="{FONT}" font-size="15" fill="{INK48}">{esc(lab)}</text>')
    return ''.join(parts)


def calibration(points, precision):
    x0, y0, size = 120, 660, 480
    parts = [f'<line x1="{x0}" y1="{y0-size}" x2="{x0}" y2="{y0}" stroke="{HAIR}"/>',
             f'<line x1="{x0}" y1="{y0}" x2="{x0+size}" y2="{y0}" stroke="{HAIR}"/>',
             f'<line x1="{x0}" y1="{y0}" x2="{x0+size}" y2="{y0-size}" stroke="{INK48}" stroke-dasharray="4 6"/>',
             f'<text x="{x0+size+16}" y="{y0-size+6}" font-family="{FONT}" font-size="15" fill="{INK48}">perfectly calibrated</text>']
    for p, a in points:
        cx, cy = x0 + p * size, y0 - a * size
        parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="7" fill="{RAMP[0]}" fill-opacity="0.85"/>')
    parts.append(f'<text x="{x0}" y="{y0+40}" font-family="{FONT}" font-size="16" fill="{INK48}">predicted probability →</text>')
    # precision-at-capacity gauge
    gx, gy, gw, gh = x0 + size + 140, 220, 380, 34
    parts.append(f'<text x="{gx}" y="{gy-18}" font-family="{FONT}" font-size="16" fill="{INK48}">Precision at working capacity</text>')
    parts.append(f'<rect x="{gx}" y="{gy}" width="{gw}" height="{gh}" rx="{gh/2}" fill="{PARCH}"/>')
    parts.append(f'<rect x="{gx}" y="{gy}" width="{gw*precision:.1f}" height="{gh}" rx="{gh/2}" fill="{RAMP[0]}"/>')
    parts.append(f'<text x="{gx+gw+16}" y="{gy+gh-8}" font-family="{FONT}" font-size="24" font-weight="700" fill="{RAMP[0]}">{precision:.2f}</text>')
    return ''.join(parts)


def big_tiles(tiles):
    """tiles: [(value, label)] x3"""
    cw, gap, x0, y0, ch = 380, 30, 60, 150, 480
    parts = []
    for i, (val, lab) in enumerate(tiles):
        x = x0 + i * (cw + gap)
        parts.append(f'<rect x="{x}" y="{y0}" width="{cw}" height="{ch}" rx="18" fill="{INK}"/>')
        s = str(val)
        size = 52 if len(s) <= 6 else (34 if len(s) <= 12 else 26)
        parts.append(f'<text x="{x+30}" y="{y0+ch/2-6}" font-family="{FONT}" font-size="{size}" font-weight="700" '
                     f'letter-spacing="-1.5" fill="#ffffff">{esc(clip(s, 16))}</text>')
        parts.append(f'<text x="{x+30}" y="{y0+ch-34}" font-family="{FONT}" font-size="18" fill="#c9c9cf">{esc(lab)}</text>')
    return ''.join(parts)


def matrix(labels, abstain):
    n = len(labels)
    x0, y0, size = 260, 130, 480
    cell = size / n
    parts = []
    for i in range(n):
        for j in range(n):
            v = 0.86 if i == j else (0.10 if abs(i - j) == 1 else 0.02)
            parts.append(f'<rect x="{x0+j*cell:.1f}" y="{y0+i*cell:.1f}" width="{cell-2:.1f}" height="{cell-2:.1f}" rx="4" '
                         f'fill="{PRIMARY}" fill-opacity="{v:.2f}"/>')
        parts.append(f'<text x="{x0-12}" y="{y0+i*cell+cell/2+5:.1f}" text-anchor="end" font-family="{FONT}" '
                     f'font-size="14" fill="{INK48}">{esc(clip(labels[i], 16))}</text>')
        ax, ay = x0 + n * cell + 40, y0 + i * cell
        ab = abstain[i]
        parts.append(f'<rect x="{ax}" y="{ay:.1f}" width="140" height="{cell-6:.1f}" rx="5" fill="{PARCH}"/>')
        parts.append(f'<rect x="{ax}" y="{ay:.1f}" width="{140*ab:.1f}" height="{cell-6:.1f}" rx="5" fill="{RAMP[3]}"/>')
    parts.append(f'<text x="{x0+n*cell+40}" y="{y0-16}" font-family="{FONT}" font-size="15" fill="{INK48}">abstain rate</text>')
    for j in range(n):
        parts.append(f'<text x="{x0+j*cell+cell/2:.1f}" y="{y0-16}" text-anchor="middle" font-family="{FONT}" '
                     f'font-size="13" fill="{INK48}">{esc(clip(labels[j], 8))}</text>')
    return ''.join(parts)


def process_before_after(before_n, after_n, note):
    x0, y0 = 140, 640
    parts = [f'<text x="{x0}" y="90" font-family="{FONT}" font-size="16" fill="{INK48}">{esc(note)}</text>',
             f'<text x="{x0}" y="{y0-380}" font-family="{FONT}" font-size="17" fill="{INK48}">Before</text>',
             f'<text x="{x0+560}" y="{y0-380}" font-family="{FONT}" font-size="17" fill="{INK48}">After</text>']
    for i in range(before_n):
        y = y0 - i * ((340) / before_n)
        parts.append(f'<rect x="{x0}" y="{y-4:.1f}" width="360" height="3.4" fill="{HAIR}"/>')
    parts.append(f'<text x="{x0}" y="{y0+50}" font-family="{FONT}" font-size="56" font-weight="700" fill="{INK}">{before_n}</text>')
    parts.append(f'<text x="{x0+90}" y="{y0+50}" font-family="{FONT}" font-size="18" fill="{INK48}">manual steps</text>')
    for i in range(after_n):
        y = y0 - i * (200 / after_n)
        parts.append(f'<rect x="{x0+560}" y="{y-18:.1f}" width="360" height="15" rx="6" fill="{RAMP[0]}" fill-opacity="{0.5+0.5*i/after_n:.2f}"/>')
    parts.append(f'<text x="{x0+560}" y="{y0+50}" font-family="{FONT}" font-size="56" font-weight="700" fill="{RAMP[0]}">{after_n}</text>')
    parts.append(f'<text x="{x0+660}" y="{y0+50}" font-family="{FONT}" font-size="18" fill="{INK48}">idempotent jobs</text>')
    parts.append(f'<path d="M{x0+380} {y0-100} L{x0+540} {y0-100}" stroke="{INK48}" stroke-width="2.4" '
                 f'stroke-dasharray="2 7" marker-end="url(#arrow)"/>')
    parts.append(f'<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">'
                 f'<path d="M0 0 L6 3 L0 6 Z" fill="{INK48}"/></marker></defs>')
    return ''.join(parts)


def wireframe(tiles, table_label):
    x0, y0, tw, th, gap = 100, 140, 380, 200, 40
    parts = []
    for i, lab in enumerate(tiles):
        x = x0 + i * (tw + gap)
        parts.append(f'<rect x="{x}" y="{y0}" width="{tw}" height="{th}" rx="14" fill="{CANVAS}" stroke="{HAIR}" stroke-width="1.4"/>')
        parts.append(f'<rect x="{x+24}" y="{y0+24}" width="90" height="12" rx="6" fill="{RAMP[3]}"/>')
        parts.append(f'<text x="{x+24}" y="{y0+80}" font-family="{FONT}" font-size="22" font-weight="700" fill="{INK}">{esc(lab)}</text>')
        parts.append(f'<rect x="{x+24}" y="{y0+110}" width="{tw-48}" height="10" rx="5" fill="{PARCH}"/>')
        parts.append(f'<rect x="{x+24}" y="{y0+132}" width="{(tw-48)*0.6:.0f}" height="10" rx="5" fill="{PARCH}"/>')
        cx = x + tw / 2
        parts.append(f'<line x1="{cx:.1f}" y1="{y0+th}" x2="{cx:.1f}" y2="{y0+th+90}" stroke="{HAIR}" stroke-dasharray="4 6"/>')
    ty = y0 + th + 90
    tw_all = len(tiles) * tw + (len(tiles) - 1) * gap
    parts.append(f'<rect x="{x0}" y="{ty}" width="{tw_all}" height="90" rx="12" fill="{INK}"/>')
    parts.append(f'<text x="{x0+28}" y="{ty+54}" font-family="{FONT}" font-size="20" font-weight="600" fill="#ffffff">{esc(table_label)}</text>')
    return ''.join(parts)


def queue_list(rows, unit=''):
    """rows: [(title, meta, value)] — ranked cards with a value bar."""
    hi = max(v for _, _, v in rows) or 1
    x0, y0, w, rh, gap = 60, 100, 1280, 96, 16
    parts = []
    for i, (title, meta, val) in enumerate(rows):
        y = y0 + i * (rh + gap)
        parts.append(f'<rect x="{x0}" y="{y}" width="{w}" height="{rh}" rx="12" fill="{PARCH}"/>')
        parts.append(f'<rect x="{x0}" y="{y}" width="6" height="{rh}" rx="3" fill="{RAMP[0] if i==0 else RAMP[2]}"/>')
        parts.append(f'<text x="{x0+34}" y="{y+38}" font-family="{FONT}" font-size="19" font-weight="600" fill="{INK}">{esc(clip(title, 48))}</text>')
        parts.append(f'<text x="{x0+34}" y="{y+68}" font-family="{FONT}" font-size="16" fill="{INK48}">{esc(clip(meta, 60))}</text>')
        bw = (val / hi) * 160
        parts.append(f'<rect x="{x0+w-260}" y="{y+rh/2-10:.0f}" width="160" height="20" rx="10" fill="{CANVAS}"/>')
        parts.append(f'<rect x="{x0+w-260}" y="{y+rh/2-10:.0f}" width="{max(bw,6):.1f}" height="20" rx="10" fill="{RAMP[0]}"/>')
        parts.append(f'<text x="{x0+w-24}" y="{y+rh/2+6:.0f}" text-anchor="end" font-family="{FONT}" '
                     f'font-size="17" font-weight="700" fill="{INK}">{esc(str(val))}{unit}</text>')
    return ''.join(parts)


def donut_and_line(donut, line_series, line_unit):
    cx, cy, r = 320, 380, 220
    total = sum(v for _, v in donut)
    a0 = -90.0
    parts = []
    import math
    for i, (lab, v) in enumerate(donut):
        frac = v / total
        a1 = a0 + frac * 360
        large = 1 if (a1 - a0) > 180 else 0
        x0p = cx + r * math.cos(math.radians(a0))
        y0p = cy + r * math.sin(math.radians(a0))
        x1p = cx + r * math.cos(math.radians(a1))
        y1p = cy + r * math.sin(math.radians(a1))
        color = RAMP[i % len(RAMP)]
        parts.append(f'<path d="M{cx} {cy} L{x0p:.1f} {y0p:.1f} A{r} {r} 0 {large} 1 {x1p:.1f} {y1p:.1f} Z" fill="{color}"/>')
        a0 = a1
    parts.append(f'<circle cx="{cx}" cy="{cy}" r="{r*0.55:.0f}" fill="{CANVAS}"/>')
    parts.append(f'<text x="{cx}" y="{cy-4}" text-anchor="middle" font-family="{FONT}" font-size="30" font-weight="700" fill="{INK}">{donut[0][1]:.0f}%</text>')
    parts.append(f'<text x="{cx}" y="{cy+24}" text-anchor="middle" font-family="{FONT}" font-size="14" fill="{INK48}">{esc(clip(donut[0][0],18))}</text>')
    ly = cy - r
    for i, (lab, v) in enumerate(donut):
        parts.append(f'<rect x="{cx+r+60}" y="{ly+i*32:.0f}" width="14" height="14" rx="3" fill="{RAMP[i % len(RAMP)]}"/>')
        parts.append(f'<text x="{cx+r+82}" y="{ly+i*32+12:.0f}" font-family="{FONT}" font-size="16" fill="{INK}">{esc(lab)} — {v:.0f}%</text>')
    # profit line, right half
    lx0, ly0, lw, lh = cx + r + 60, 560, 460, 200
    vals = [v for _, v in line_series]
    hi, lo = max(vals) * 1.15, min(vals) * 0.85
    span = hi - lo or 1
    n = len(line_series)
    px = lambda i: lx0 + (lw * i / (n - 1))
    py = lambda v: ly0 - ((v - lo) / span) * lh
    pts = [(px(i), py(v)) for i, (_, v) in enumerate(line_series)]
    d = 'M ' + ' L '.join(f'{a:.1f} {b:.1f}' for a, b in pts)
    parts.append(f'<text x="{lx0}" y="{ly0-lh-24}" font-family="{FONT}" font-size="16" fill="{INK48}">Profit by quarter ({line_unit})</text>')
    parts.append(f'<path d="{d} L{pts[-1][0]:.1f} {ly0:.1f} L{pts[0][0]:.1f} {ly0:.1f} Z" fill="{RAMP[0]}" fill-opacity="0.15"/>')
    parts.append(f'<path d="{d}" fill="none" stroke="{RAMP[0]}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>')
    for i, (lab, v) in enumerate(line_series):
        x, y = px(i), py(v)
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4.5" fill="{CANVAS}" stroke="{RAMP[0]}" stroke-width="2.4"/>')
        parts.append(f'<text x="{x:.1f}" y="{ly0+26}" text-anchor="middle" font-family="{FONT}" font-size="14" fill="{INK48}">{lab}</text>')
    return ''.join(parts)


def waste_availability(waste, avail):
    """Two mini line charts stacked: fresh waste % and availability %."""
    x0, w = 120, 1160
    parts = []
    for row, (label, series, color) in enumerate([
        ('Fresh waste, % of fresh revenue', waste, BAD),
        ('Availability, top 100 lines (%)', avail, GOOD),
    ]):
        y0 = 330 + row * 300
        vals = [v for _, v in series]
        hi, lo = max(vals) * 1.1, min(vals) * 0.9
        span = hi - lo or 1
        n = len(series)
        px = lambda i: x0 + (w * i / (n - 1))
        py = lambda v: y0 - ((v - lo) / span) * 160
        parts.append(f'<text x="{x0}" y="{y0-190}" font-family="{FONT}" font-size="16" fill="{INK48}">{esc(label)}</text>')
        pts = [(px(i), py(v)) for i, (_, v) in enumerate(series)]
        d = 'M ' + ' L '.join(f'{a:.1f} {b:.1f}' for a, b in pts)
        parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>')
        for i, (lab, v) in enumerate(series):
            x, y = px(i), py(v)
            parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{CANVAS}" stroke="{color}" stroke-width="2.6"/>')
            parts.append(f'<text x="{x:.1f}" y="{y-16:.1f}" text-anchor="middle" font-family="{FONT}" font-size="15" font-weight="700" fill="{color}">{v}</text>')
            parts.append(f'<text x="{x:.1f}" y="{y0+26}" text-anchor="middle" font-family="{FONT}" font-size="14" fill="{INK48}">{lab}</text>')
    return ''.join(parts)


# ---------------------------------------------------------------- specs

SPECS = {
    'cemea-sales-dashboard': [
        ('top performers', lambda: frame(ranked_bars([
            ('CEMEA-DACH Retail', 6.2, '+18%'),
            ('Gulf Enterprise', 4.1, '+9%'),
            ('Iberia Retail', 3.4, '+12%'),
            ('South Africa SMB', 2.1, '−4%'),
            ('Levant Channel', 1.6, '+6%'),
        ], unit='M'), 'Revenue by region · €M, YoY')),
        ('margin detail', lambda: frame(donut_and_line(
            [('Leading segment', 39), ('Enterprise', 27), ('SMB', 19), ('Other', 15)],
            [('Q1', 4.1), ('Q2', 4.6), ('Q3', 5.1), ('Q4', 5.5)], '€M'), 'Segment mix & profit trend')),
    ],
    'freelance-automation-bi': [
        ('spec sheet', lambda: frame(table(
            ['Source', 'Cadence', 'Validation', 'Owner'],
            [
                ['Shopify orders API', 'Hourly', 'Row-count + schema', 'Ops lead'],
                ['Supplier portal (scrape)', 'Daily 06:00', 'Selector + totals check', 'Analyst'],
                ['Bank statement export', 'Daily', 'Reconciled to ledger', 'Finance'],
                ['CRM contacts', 'Every 15 min', 'Dedup + null-check', 'Sales ops'],
                ['Warehouse WMS', 'Daily', 'Stock variance < 0.5%', 'Warehouse lead'],
            ], [340, 220, 320, 220]), 'Pipeline specification')),
        ('wireframe', lambda: frame(wireframe(['Revenue', 'Retention', 'Fulfilment'], 'fct_orders · fct_subscriptions · fct_shipments'), 'Reporting wireframe')),
    ],
    'ocean-drones': [
        ('telemetry', lambda: frame(line_band(
            [('D1', 8.1), ('D2', 8.05), ('D3', 8.08), ('D4', 8.02), ('D5', 7.98), ('D6', 7.95),
             ('D7', 7.99), ('D8', 7.9), ('D9', 7.78), ('D10', 7.65), ('D11', 7.6), ('D12', 7.55)],
            7.95, 8.05, 8, 'divergence flagged'), 'pH vs seasonal baseline')),
        ('review queue', lambda: frame(queue_list([
            ('Loggerhead turtle', 'Frame 0412 · confirmed', 94),
            ('Reef shark', 'Frame 0398 · confirmed', 88),
            ('Spinner dolphin', 'Frame 0455 · confirmed', 97),
            ('Unidentified ray', 'Frame 0466 · sent to review', 51),
            ('Unknown debris', 'Frame 0470 · sent to review', 22),
        ], unit='%'), 'Classification review queue')),
    ],
    'retail-demand-forecast': [
        ('category accuracy', lambda: frame(grouped_bars([
            ('Bakery', 91, 76), ('Chilled meats', 84, 79), ('Produce', 79, 71),
            ('Dairy', 88, 82), ('Frozen', 86, 80),
        ], 'Model', 'Seasonal-naive'), 'Accuracy by category (%)')),
        ('weekly review', lambda: frame(waste_availability(
            [('W1', 6.4), ('W4', 5.6), ('W8', 4.7), ('W12', 4.1)],
            [('W1', 93.1), ('W4', 95.0), ('W8', 96.4), ('W12', 97.6)],
        ), 'Waste and availability, weekly')),
    ],
    'churn-early-warning': [
        ('calibration', lambda: frame(calibration([
            (0.05, 0.06), (0.15, 0.14), (0.25, 0.27), (0.35, 0.33), (0.45, 0.46),
            (0.55, 0.53), (0.65, 0.67), (0.75, 0.74), (0.85, 0.86), (0.95, 0.93),
        ], 0.46), 'Calibration curve')),
        ('drivers', lambda: frame(ranked_bars([
            ('Seat activation ↓32%', -0.18, ''),
            ('Weekly active users ↓', -0.14, ''),
            ('Support sentiment negative', -0.11, ''),
            ('Feature depth stable', 0.06, ''),
            ('Admin logins flat', 0.04, ''),
        ], signed=True), 'Per-account risk drivers')),
    ],
    'finance-close-automation': [
        ('exceptions', lambda: frame(table(
            ['Entity pair', 'Amount', 'Status'],
            [
                ['IE ↔ NL intercompany', '€18,240', 'Break — timing'],
                ['IE ↔ DE intercompany', '€4,120', 'Matched'],
                ['Bank — IE current a/c', '€960', 'Break — FX rounding'],
                ['NL ↔ DE intercompany', '€31,500', 'Matched'],
                ['Bank — DE payroll', '€2,240', 'Break — unmatched fee'],
            ], [380, 260, 460]), 'Reconciliation exception queue')),
        ('before after', lambda: frame(process_before_after(61, 9, 'Eleven duplicated steps and four unread outputs deleted first'), 'Steps before and after')),
    ],
    'logistics-control-tower': [
        ('lane performance', lambda: frame(ranked_bars([
            ('Rotterdam→Cork trunk', 34, '14.2h dwell'),
            ('Cork city final-mile', 27, '6.1h dwell'),
            ('Rotterdam city final-mile', 12, '5.4h dwell'),
            ('Cork→Rotterdam trunk', 9, '8.0h dwell'),
            ('Regional cross-dock', 6, '3.2h dwell'),
        ], unit='%'), 'Exception rate by lane')),
        ('floor display', lambda: frame(big_tiles([
            (14, 'Open exceptions right now'),
            ('Rotterdam→Cork', 'Worst lane this week'),
            ('6h 40m', 'Oldest open consignment'),
        ]), 'Floor display')),
    ],
    'clinic-nlp-triage': [
        ('confusion matrix', lambda: frame(matrix(
            ['Appt change', 'Prescription', 'Billing', 'General', 'Clinical', 'Complaint'],
            [0.03, 0.05, 0.04, 0.11, 0.02, 0.07],
        ), 'Confusion matrix · six of nine intents')),
        ('audit log', lambda: frame(table(
            ['Enquiry', 'Confidence', 'Decision'],
            [
                ['"Can I move my Thursday appt..."', '0.97', 'Appointment queue'],
                ['"Reaction after the injection..."', '0.99', 'Clinical flag → human'],
                ['"Invoice seems higher than quoted"', '0.88', 'Billing queue'],
                ['"Not sure who to ask about..."', '0.41', 'Abstain → general'],
                ['"Cancel and refund please"', '0.92', 'Billing queue'],
            ], [560, 220, 320]), 'Routing audit log')),
    ],
    'energy-anomaly-detection': [
        ('meter baseline', lambda: frame(line_band(
            [('00:00', 42), ('02:00', 40), ('04:00', 41), ('06:00', 39), ('08:00', 40),
             ('10:00', 41), ('12:00', 68), ('14:00', 71), ('16:00', 69), ('18:00', 70),
             ('20:00', 68), ('22:00', 72), ('23:30', 70), ('23:59', 69)],
            38, 43, 6, 'chiller running unoccupied'), 'Half-hourly load vs baseline')),
        ('alert queue', lambda: frame(queue_list([
            ('Building 14 — Chiller AHU-3', 'Overnight run', 91),
            ('Building 41 — Boiler plant', 'Stuck valve', 64),
            ('Building 22 — AHU-1', 'Simultaneous heat/cool', 47),
            ('Building 7 — Lighting panel B', 'Schedule left on', 33),
            ('Building 55 — Chiller AHU-2', 'Sensor drift', 28),
        ], unit='/day'), 'Alert queue, ranked by €/day')),
    ],
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0.0
    count = 0
    with tempfile.TemporaryDirectory() as tmp:
        for slug, slots in SPECS.items():
            for i, (_, builder) in enumerate(slots, start=1):
                svg_content = builder()
                svg = Path(tmp) / f'{slug}-{i}.svg'
                png = OUT / f'{slug}-{i}.png'
                svg.write_text(svg_content, encoding='utf-8')
                subprocess.run(['sips', '-s', 'format', 'png', str(svg), '--out', str(png)],
                               check=True, capture_output=True)
                kb = png.stat().st_size / 1024
                total += kb
                count += 1
                print(f'  {slug}-{i:<2} {kb:6.0f} KB')
    print(f'\n  {count} images, {total/1024:.1f} MB total, {W}x{H} each')


if __name__ == '__main__':
    main()
