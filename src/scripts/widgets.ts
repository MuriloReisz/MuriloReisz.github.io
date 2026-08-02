// ============================================================
//  widgets.ts — presentation widgets (framework-free, no deps)
//  Pairs with site.ts (page behaviour), motion.ts / motion2.ts
//  (animation) and demos.ts (playground). Everything this file
//  injects is namespaced .ix-* and styled in src/styles/ix.css.
//
//  Hooks — each one is independently inert when absent:
//   [data-chart="bar|line|donut"] + data-series='[…]'
//   [data-lightbox-group="name"]
//   [data-copy="text"]
//   [data-filter-search] / [data-sort] / [data-view-toggle]
//        → all three drive the same [data-filter-item] set.
//
//  Nothing here duplicates a site.ts hook: site.ts owns
//  .toolfilter / .cs-qa; motion.ts owns
//  [data-counter-to]. This file owns the attributes listed above.
// ============================================================

import { $, $$, clamp, decN, prefersReduced, onMotionChange } from './dom';

let reduced = prefersReduced();
onMotionChange((isReduced) => {
  reduced = isReduced;
});

const RAMP = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'];
const rampVar = (i: number) => `var(${RAMP[i % RAMP.length]})`;

/** Colour token for a datum: "c3" / "--c3" / "var(--c3)" / any CSS colour. */
function colourOf(raw: string | undefined, i: number): string {
  if (!raw) return rampVar(i);
  const t = raw.trim();
  if (/^c[1-6]$/.test(t)) return `var(--${t})`;
  if (t.startsWith('--')) return `var(${t})`;
  return t;
}

/* ---------- shared live region ---------- */

let liveEl: HTMLElement | null = null;
function announce(msg: string) {
  if (!liveEl) {
    liveEl = document.createElement('div');
    liveEl.id = 'ixStatus';
    liveEl.className = 'u-sr';
    liveEl.setAttribute('role', 'status');
    liveEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveEl);
  }
  // Re-set to the same string still needs to re-announce.
  liveEl.textContent = '';
  window.setTimeout(() => {
    if (liveEl) liveEl.textContent = msg;
  }, 30);
}

/* ---------- SVG helpers ---------- */

const NS = 'http://www.w3.org/2000/svg';
function mk<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
  cls?: string
): SVGElementTagNameMap[K] {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  if (cls) n.setAttribute('class', cls);
  return n;
}

/* ============================================================
   Charts — [data-chart]
   ============================================================ */

type Datum = { label: string; value: number; color?: string; note?: string };

const charts = $$('[data-chart]');

if (charts.length) {
  /* -- number formatting (decN caches per decimal count) ------------------ */
  function makeFmt(host: HTMLElement) {
    const pre = host.dataset.chartPrefix ?? '';
    const suf = host.dataset.chartSuffix ?? '';
    const dec = Math.max(0, Math.min(4, Number(host.dataset.chartDec ?? '0') || 0));
    const f = decN(dec);
    return (v: number) => pre + f.format(v) + suf;
  }

  /** 1 / 2 / 2.5 / 5 × 10ⁿ ceiling so gridlines land on round numbers. */
  function niceMax(v: number) {
    if (!isFinite(v) || v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  function parseSeries(host: HTMLElement): Datum[] {
    const raw = host.dataset.series;
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((d): Datum | null => {
          if (!d || typeof d !== 'object') return null;
          const o = d as Record<string, unknown>;
          const value = Number(o.value);
          return {
            label: String(o.label ?? ''),
            value: isFinite(value) ? value : 0,
            color: typeof o.color === 'string' ? o.color : undefined,
            note: typeof o.note === 'string' ? o.note : undefined,
          };
        })
        .filter((d): d is Datum => d !== null);
    } catch {
      return [];
    }
  }

  /* -- tooltip ------------------------------------------------------------ */
  type Tip = { root: HTMLElement; lbl: HTMLElement; val: HTMLElement; sub: HTMLElement };

  function buildTip(host: HTMLElement): Tip {
    const root = document.createElement('div');
    root.className = 'ix-chart__tip';
    root.setAttribute('aria-hidden', 'true');
    root.hidden = true;
    const lbl = document.createElement('span');
    lbl.className = 'ix-chart__tip-l';
    const val = document.createElement('span');
    val.className = 'ix-chart__tip-v';
    const sub = document.createElement('span');
    sub.className = 'ix-chart__tip-sub';
    root.append(lbl, val, sub);
    host.appendChild(root);
    return { root, lbl, val, sub };
  }

  function showTip(host: HTMLElement, tip: Tip, target: SVGGraphicsElement, d: Datum, text: string) {
    const hb = host.getBoundingClientRect();
    const tb = target.getBoundingClientRect();
    if (!hb.width) return;
    const x = clamp(((tb.left + tb.width / 2 - hb.left) / hb.width) * 100, 4, 96);
    const y = clamp(((tb.top - hb.top) / hb.height) * 100, 0, 100);
    tip.root.style.setProperty('--ix-tip-x', x + '%');
    tip.root.style.setProperty('--ix-tip-y', y + '%');
    tip.lbl.textContent = d.label;
    tip.val.textContent = text;
    tip.sub.textContent = d.note ?? '';
    tip.sub.hidden = !d.note;
    tip.root.hidden = false;
    tip.root.classList.add('is-on');
  }

  function hideTip(tip: Tip) {
    tip.root.classList.remove('is-on');
    tip.root.hidden = true;
  }

  /** Wires hover AND focus to the same tooltip for one datum. */
  function bindDatum(
    host: HTMLElement,
    tip: Tip,
    g: SVGGraphicsElement,
    hit: SVGGraphicsElement,
    d: Datum,
    text: string
  ) {
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', `${d.label}: ${text}${d.note ? '. ' + d.note : ''}`);
    const on = () => showTip(host, tip, hit, d, text);
    const off = () => hideTip(tip);
    g.addEventListener('pointerenter', on);
    g.addEventListener('pointermove', on);
    g.addEventListener('pointerleave', off);
    g.addEventListener('focus', on);
    g.addEventListener('blur', off);
    g.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Escape') off();
    });
  }

  /* -- accessible fallback ------------------------------------------------ */
  function buildTable(host: HTMLElement, data: Datum[], title: string, fmt: (v: number) => string) {
    const wrap = document.createElement('div');
    wrap.className = 'u-sr';
    const t = document.createElement('table');
    t.className = 'ix-chart__table';
    const cap = document.createElement('caption');
    cap.textContent = title ? `${title} — data table` : 'Chart data table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th scope="col">Item</th><th scope="col">Value</th></tr>';
    const tb = document.createElement('tbody');
    data.forEach((d) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.textContent = d.label;
      const td = document.createElement('td');
      td.textContent = fmt(d.value) + (d.note ? ` (${d.note})` : '');
      tr.append(th, td);
      tb.appendChild(tr);
    });
    t.append(cap, thead, tb);
    wrap.appendChild(t);
    host.appendChild(wrap);
  }

  function buildLegend(host: HTMLElement, data: Datum[], fmt: (v: number) => string) {
    const ul = document.createElement('ul');
    ul.className = 'ix-chart__legend';
    ul.setAttribute('aria-hidden', 'true');
    data.forEach((d, i) => {
      const li = document.createElement('li');
      li.className = 'ix-chart__legend-row';
      const sw = document.createElement('span');
      sw.className = 'ix-chart__legend-sw';
      sw.style.background = colourOf(d.color, i);
      const l = document.createElement('span');
      l.className = 'ix-chart__legend-l';
      l.textContent = d.label;
      const v = document.createElement('span');
      v.className = 'ix-chart__legend-v';
      v.textContent = fmt(d.value);
      li.append(sw, l, v);
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  /* -- bar ---------------------------------------------------------------- */
  const W = 640;
  const H = 300;

  function renderBar(host: HTMLElement, data: Datum[], tip: Tip, fmt: (v: number) => string) {
    const padL = host.dataset.chartAxis === 'none' ? 6 : 46;
    const padR = 8;
    const padT = 18;
    const padB = 36;
    const iw = W - padL - padR;
    const ih = H - padT - padB;
    const max = niceMax(Number(host.dataset.chartMax) || Math.max(...data.map((d) => d.value), 0));
    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group' }, 'ix-chart__svg');
    svg.setAttribute('aria-label', host.dataset.chartTitle || 'Bar chart');

    /* gridlines + y labels */
    if (host.dataset.chartAxis !== 'none') {
      const g = mk('g', {}, 'ix-chart__grid');
      for (let i = 0; i <= 4; i++) {
        const y = padT + ih - (ih * i) / 4;
        g.appendChild(mk('line', { x1: padL, y1: y, x2: W - padR, y2: y }, 'ix-chart__gridline'));
        const t = mk('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end' }, 'ix-chart__ylbl');
        t.textContent = fmt((max * i) / 4);
        g.appendChild(t);
      }
      svg.appendChild(g);
    }

    const n = Math.max(1, data.length);
    const slot = iw / n;
    const bw = Math.min(64, slot * 0.62);
    data.forEach((d, i) => {
      const cx = padL + slot * i + slot / 2;
      const h = max > 0 ? clamp((d.value / max) * ih, 0, ih) : 0;
      const y = padT + ih - h;
      const g = mk('g', {}, 'ix-chart__datum ix-chart__bar');
      const hit = mk(
        'rect',
        { x: cx - slot / 2, y: padT, width: slot, height: ih, fill: 'transparent' },
        'ix-chart__hit'
      );
      const track = mk(
        'rect',
        { x: cx - bw / 2, y: padT, width: bw, height: ih, rx: 4 },
        'ix-chart__bar-track'
      );
      const fill = mk(
        'rect',
        { x: cx - bw / 2, y, width: bw, height: Math.max(h, 1), rx: 4 },
        'ix-chart__bar-fill'
      );
      fill.style.fill = colourOf(d.color, i);
      fill.style.transformBox = 'fill-box';
      fill.style.transformOrigin = '50% 100%';
      if (!reduced) {
        fill.style.transform = 'scaleY(0)';
        fill.style.transition = `transform .72s var(--reveal-ease) ${i * 55}ms`;
      }
      const lab = mk('text', { x: cx, y: H - padB + 20, 'text-anchor': 'middle' }, 'ix-chart__xlbl');
      lab.textContent = d.label;
      g.append(track, fill, hit);
      svg.append(g, lab);
      bindDatum(host, tip, g, fill, d, fmt(d.value));
    });

    return {
      svg,
      play: () =>
        $$<SVGRectElement>('.ix-chart__bar-fill', svg).forEach((rc) => (rc.style.transform = 'scaleY(1)')),
    };
  }

  /* -- line --------------------------------------------------------------- */
  function renderLine(host: HTMLElement, data: Datum[], tip: Tip, fmt: (v: number) => string) {
    const padL = host.dataset.chartAxis === 'none' ? 6 : 46;
    const padR = 14;
    const padT = 18;
    const padB = 36;
    const iw = W - padL - padR;
    const ih = H - padT - padB;
    const max = niceMax(Number(host.dataset.chartMax) || Math.max(...data.map((d) => d.value), 0));
    const stroke = colourOf(host.dataset.chartColor, 0);
    const svg = mk('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group' }, 'ix-chart__svg');
    svg.setAttribute('aria-label', host.dataset.chartTitle || 'Line chart');

    if (host.dataset.chartAxis !== 'none') {
      const g = mk('g', {}, 'ix-chart__grid');
      for (let i = 0; i <= 4; i++) {
        const y = padT + ih - (ih * i) / 4;
        g.appendChild(mk('line', { x1: padL, y1: y, x2: W - padR, y2: y }, 'ix-chart__gridline'));
        const t = mk('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end' }, 'ix-chart__ylbl');
        t.textContent = fmt((max * i) / 4);
        g.appendChild(t);
      }
      svg.appendChild(g);
    }

    const n = Math.max(1, data.length - 1);
    const xAt = (i: number) => (data.length === 1 ? padL + iw / 2 : padL + (iw * i) / n);
    const yAt = (v: number) => padT + ih - (max > 0 ? clamp((v / max) * ih, 0, ih) : 0);
    const pts = data.map((d, i) => [xAt(i), yAt(d.value)] as const);
    const dPath = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

    const area = mk(
      'path',
      { d: `${dPath} L${xAt(data.length - 1).toFixed(1)} ${padT + ih} L${xAt(0).toFixed(1)} ${padT + ih} Z` },
      'ix-chart__area'
    );
    area.style.fill = stroke;
    const path = mk('path', { d: dPath, fill: 'none' }, 'ix-chart__line');
    path.style.stroke = stroke;
    svg.append(area, path);

    data.forEach((d, i) => {
      const [cx, cy] = pts[i];
      const g = mk('g', {}, 'ix-chart__datum ix-chart__pt');
      const hit = mk('circle', { cx, cy, r: 16, fill: 'transparent' }, 'ix-chart__hit');
      const dot = mk('circle', { cx, cy, r: 5 }, 'ix-chart__dot');
      dot.style.fill = stroke;
      if (!reduced) {
        dot.style.opacity = '0';
        dot.style.transition = `opacity .3s linear ${420 + i * 60}ms`;
      }
      g.append(dot, hit);
      svg.appendChild(g);
      if (i === 0 || i === data.length - 1 || data.length <= 8) {
        const lab = mk('text', { x: cx, y: H - padB + 20, 'text-anchor': 'middle' }, 'ix-chart__xlbl');
        lab.textContent = d.label;
        svg.appendChild(lab);
      }
      bindDatum(host, tip, g, dot, d, fmt(d.value));
    });

    let len = 0;
    try {
      len = path.getTotalLength();
    } catch {
      len = 0;
    }
    if (!reduced && len) {
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.transition = 'stroke-dashoffset 1s var(--reveal-ease)';
      area.style.opacity = '0';
      area.style.transition = 'opacity .7s linear .35s';
    }
    return {
      svg,
      play: () => {
        path.style.strokeDashoffset = '0';
        area.style.opacity = '';
        $$<SVGCircleElement>('.ix-chart__dot', svg).forEach((c) => (c.style.opacity = '1'));
      },
    };
  }

  /* -- donut -------------------------------------------------------------- */
  function renderDonut(host: HTMLElement, data: Datum[], tip: Tip, fmt: (v: number) => string) {
    const S = 240;
    const r = 88;
    const sw = 26;
    const C = 2 * Math.PI * r;
    const total = data.reduce((a, d) => a + Math.max(0, d.value), 0);
    const svg = mk('svg', { viewBox: `0 0 ${S} ${S}`, role: 'group' }, 'ix-chart__svg');
    svg.setAttribute('aria-label', host.dataset.chartTitle || 'Donut chart');
    svg.appendChild(mk('circle', { cx: S / 2, cy: S / 2, r, fill: 'none', 'stroke-width': sw }, 'ix-chart__ring'));

    const g = mk('g', { transform: `rotate(-90 ${S / 2} ${S / 2})` }, 'ix-chart__arcs');
    let acc = 0;
    const arcs: { el: SVGCircleElement; seg: number }[] = [];
    data.forEach((d, i) => {
      const frac = total > 0 ? Math.max(0, d.value) / total : 0;
      const seg = Math.max(frac * C - 1.5, 0);
      const arc = mk(
        'circle',
        {
          cx: S / 2,
          cy: S / 2,
          r,
          fill: 'none',
          'stroke-width': sw,
          'stroke-linecap': 'butt',
          'stroke-dashoffset': String(-acc),
        },
        'ix-chart__arc'
      );
      arc.style.stroke = colourOf(d.color, i);
      arc.style.strokeDasharray = reduced ? `${seg} ${C}` : `0 ${C}`;
      if (!reduced) arc.style.transition = `stroke-dasharray .8s var(--reveal-ease) ${i * 90}ms`;
      const wrap = mk('g', {}, 'ix-chart__datum ix-chart__slice');
      wrap.appendChild(arc);
      g.appendChild(wrap);
      arcs.push({ el: arc, seg });
      const pct = total > 0 ? Math.round(frac * 1000) / 10 : 0;
      bindDatum(host, tip, wrap, arc, d, `${fmt(d.value)} · ${pct}%`);
      acc += frac * C;
    });
    svg.appendChild(g);

    const cv = mk('text', { x: S / 2, y: S / 2 + 2, 'text-anchor': 'middle' }, 'ix-chart__center-v');
    cv.textContent = host.dataset.chartCenter ?? fmt(total);
    cv.setAttribute('aria-hidden', 'true');
    svg.appendChild(cv);
    const cl = host.dataset.chartCenterLabel;
    if (cl) {
      const t = mk('text', { x: S / 2, y: S / 2 + 24, 'text-anchor': 'middle' }, 'ix-chart__center-l');
      t.textContent = cl;
      t.setAttribute('aria-hidden', 'true');
      svg.appendChild(t);
    }

    return {
      svg,
      play: () => arcs.forEach((a) => (a.el.style.strokeDasharray = `${a.seg} ${C}`)),
    };
  }

  /* -- boot + re-render on data-series change ----------------------------- */
  const playMap = new WeakMap<HTMLElement, () => void>();
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries, obs) => {
            entries.forEach((e) => {
              if (!e.isIntersecting) return;
              obs.unobserve(e.target);
              const play = playMap.get(e.target as HTMLElement);
              if (play) requestAnimationFrame(() => requestAnimationFrame(play));
            });
          },
          { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }
        )
      : null;

  function render(host: HTMLElement) {
    const kind = (host.dataset.chart || 'bar').toLowerCase();
    const data = parseSeries(host);
    const fmt = makeFmt(host);
    host.textContent = '';
    host.classList.add('ix-chart', `ix-chart--${kind}`);
    if (!data.length) {
      const p = document.createElement('p');
      p.className = 'ix-chart__empty';
      p.textContent = 'No data available.';
      host.appendChild(p);
      return;
    }
    const tip = buildTip(host);
    const out =
      kind === 'donut' ? renderDonut(host, data, tip, fmt)
      : kind === 'line' ? renderLine(host, data, tip, fmt)
      : renderBar(host, data, tip, fmt);
    host.insertBefore(out.svg, tip.root);
    if (kind === 'donut' || host.dataset.chartLegend === 'on') buildLegend(host, data, fmt);
    buildTable(host, data, host.dataset.chartTitle ?? '', fmt);
    host.addEventListener('pointerleave', () => hideTip(tip));

    if (reduced) return;
    playMap.set(host, out.play);
    if (io) io.observe(host);
    else requestAnimationFrame(() => requestAnimationFrame(out.play));
  }

  charts.forEach((host) => {
    render(host);
    /* demos.ts swaps data-series on a bound chart; re-render when it does. */
    new MutationObserver(() => render(host)).observe(host, {
      attributes: true,
      attributeFilter: ['data-series', 'data-chart', 'data-chart-max', 'data-chart-title'],
    });
  });
}

/* ============================================================
   Lightbox — [data-lightbox-group]
   Drives the existing markup in Chrome.astro (#lightbox …).
   ============================================================ */

const lbTriggers = $$('[data-lightbox-group]');
const lbRoot = $('#lightbox');

if (lbTriggers.length && lbRoot) {
  const lbImg = $<HTMLImageElement>('#lightboxImg');
  const lbCap = $('#lightboxCap');
  const lbClose = $<HTMLButtonElement>('#lightboxClose');
  const lbPrev = $<HTMLButtonElement>('#lightboxPrev');
  const lbNext = $<HTMLButtonElement>('#lightboxNext');

  type Slide = { src: string; alt: string; cap: string; el: HTMLElement };

  const groups = new Map<string, Slide[]>();

  /** Best-effort source/caption resolution so any trigger shape works. */
  function readSlide(el: HTMLElement): Slide | null {
    const inner = $<HTMLImageElement>('img', el);
    const src =
      el.dataset.lightboxSrc ||
      (el instanceof HTMLImageElement ? el.currentSrc || el.src : '') ||
      (el instanceof HTMLAnchorElement ? el.getAttribute('href') || '' : '') ||
      inner?.getAttribute('src') ||
      '';
    if (!src) return null;
    const alt =
      el.dataset.lightboxAlt ||
      (el instanceof HTMLImageElement ? el.alt : '') ||
      inner?.alt ||
      el.dataset.lightboxCap ||
      '';
    const fig = el.closest('figure');
    const cap =
      el.dataset.lightboxCap ||
      $('figcaption', el)?.textContent?.trim() ||
      (fig ? $('figcaption', fig)?.textContent?.trim() || '' : '') ||
      alt;
    return { src, alt, cap, el };
  }

  lbTriggers.forEach((el) => {
    const name = el.dataset.lightboxGroup || 'default';
    const slide = readSlide(el);
    if (!slide) return;
    const list = groups.get(name) ?? [];
    list.push(slide);
    groups.set(name, list);

    /* Make sure the trigger is a real, keyboard-operable control. */
    const native = el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement;
    if (!native) {
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      if (!el.hasAttribute('aria-label') && !el.textContent?.trim()) {
        el.setAttribute('aria-label', slide.alt ? `View image: ${slide.alt}` : 'View image');
      }
      el.addEventListener('keydown', (e) => {
        const k = (e as KeyboardEvent).key;
        if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
          e.preventDefault();
          open(name, groups.get(name)?.indexOf(slide) ?? 0, el);
        }
      });
    }
    el.classList.add('ix-lb-trigger');
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open(name, groups.get(name)?.indexOf(slide) ?? 0, el);
    });
  });

  let current: Slide[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;
  let prevOverflow = '';

  function paint() {
    const s = current[index];
    if (!s || !lbImg) return;
    lbImg.src = s.src;
    lbImg.alt = s.alt;
    if (lbCap) {
      lbCap.textContent = s.cap;
      lbCap.hidden = !s.cap;
    }
    const solo = current.length < 2;
    lbPrev?.toggleAttribute('hidden', solo);
    lbNext?.toggleAttribute('hidden', solo);
    lbRoot?.setAttribute(
      'aria-label',
      solo ? 'Image viewer' : `Image viewer — ${index + 1} of ${current.length}`
    );
    /* Warm the neighbours so paging feels instant. */
    if (!solo) {
      [current[(index + 1) % current.length], current[(index - 1 + current.length) % current.length]].forEach(
        (n) => {
          if (n) new Image().src = n.src;
        }
      );
    }
  }

  function step(dir: number) {
    if (current.length < 2) return;
    index = (index + dir + current.length) % current.length;
    paint();
    announce(`Image ${index + 1} of ${current.length}`);
  }

  function focusables(): HTMLElement[] {
    return [lbClose, lbPrev, lbNext].filter(
      (b): b is HTMLButtonElement => !!b && !b.hasAttribute('hidden')
    );
  }

  function onKey(e: KeyboardEvent) {
    if (!lbRoot?.classList.contains('is-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !lbRoot.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !lbRoot.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open(name: string, i: number, trigger: HTMLElement) {
    const list = groups.get(name);
    if (!list || !list.length || !lbRoot) return;
    current = list;
    index = clamp(i < 0 ? 0 : i, 0, list.length - 1);
    opener = trigger;
    paint();
    lbRoot.classList.add('is-open');
    document.documentElement.classList.add('ix-noscroll');
    prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    (lbClose ?? focusables()[0])?.focus();
  }

  function close() {
    if (!lbRoot) return;
    lbRoot.classList.remove('is-open');
    document.documentElement.classList.remove('ix-noscroll');
    document.documentElement.style.overflow = prevOverflow;
    document.removeEventListener('keydown', onKey);
    if (lbImg) {
      lbImg.src = '';
      lbImg.alt = '';
    }
    opener?.focus();
    opener = null;
  }

  lbClose?.addEventListener('click', close);
  lbPrev?.addEventListener('click', () => step(-1));
  lbNext?.addEventListener('click', () => step(1));
  lbRoot.addEventListener('click', (e) => {
    if (e.target === lbRoot || (e.target as HTMLElement).classList.contains('lightbox__figure')) close();
  });
}

/* ============================================================
   Copy to clipboard — [data-copy]
   ============================================================ */

const copyBtns = $$('[data-copy]');

if (copyBtns.length) {
  const write = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through to the legacy path */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.className = 'u-sr';
      ta.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  };

  copyBtns.forEach((btn) => {
    btn.classList.add('ix-copy');
    let timer = 0;
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy ?? '';
      if (!text) return;
      const ok = await write(text);
      btn.dataset.copyState = ok ? 'copied' : 'failed';
      btn.classList.toggle('is-copied', ok);
      btn.classList.toggle('is-failed', !ok);
      announce(ok ? btn.dataset.copyMessage || 'Copied to clipboard' : 'Copy failed — press ⌘C to copy manually');
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        btn.removeAttribute('data-copy-state');
        btn.classList.remove('is-copied', 'is-failed');
      }, 2200);
    });
  });
}

/* ============================================================
   Collection — [data-filter-search] + [data-sort] + [data-view-toggle]
   One state object per [data-filter-item] set, so search, sort and
   view compose instead of clobbering each other.
   ============================================================ */

const collControls = $$('[data-filter-search], [data-sort], [data-view-toggle]');

if (collControls.length && $('[data-filter-item]')) {
  type Coll = {
    scope: ParentNode;
    items: HTMLElement[];
    order: HTMLElement[];
    q: string;
    key: string;
    dir: 1 | -1;
    view: string;
    noun: string;
    storeKey: string;
    shown: number;
    sorted: boolean;
  };

  const colls = new Map<ParentNode, Coll>();

  /** Which item set does this control drive? Explicit target wins. */
  function scopeOf(el: HTMLElement): ParentNode {
    const sel = el.dataset.filterTarget || el.dataset.sortTarget || el.dataset.viewTarget;
    if (sel) {
      const t = document.querySelector(sel);
      if (t) return t;
    }
    const ac = el.getAttribute('aria-controls');
    if (ac) {
      const t = document.getElementById(ac);
      if (t) return t;
    }
    const root = el.closest('[data-filter-root]');
    if (root) return root;
    return document;
  }

  /** Match a readout/button back to an already-registered collection.
      A single-collection page needs no wiring at all. */
  function collFor(el: HTMLElement): Coll | null {
    const direct = colls.get(scopeOf(el));
    if (direct) return direct;
    if (colls.size === 1) return colls.values().next().value ?? null;
    for (const coll of colls.values()) {
      if (coll.scope instanceof HTMLElement && coll.scope.contains(el)) return coll;
    }
    return null;
  }

  function collOf(el: HTMLElement): Coll | null {
    const scope = scopeOf(el);
    const existing = colls.get(scope);
    if (existing) return existing;
    const items = $$('[data-filter-item]', scope);
    if (!items.length) return null;
    const first = items[0];
    const coll: Coll = {
      scope,
      items,
      order: items.slice(),
      q: '',
      key: '',
      dir: 1,
      view: '',
      noun:
        (first.closest('[data-filter-noun]') as HTMLElement | null)?.dataset.filterNoun ||
        (scope instanceof HTMLElement ? scope.dataset.filterNoun : '') ||
        'results',
      shown: items.length,
      sorted: false,
      storeKey:
        (scope instanceof HTMLElement && (scope.dataset.viewKey || scope.id)) ||
        first.parentElement?.id ||
        'default',
    };
    colls.set(scope, coll);
    return coll;
  }

  const searchText = (it: HTMLElement) =>
    (it.dataset.filterText || it.textContent || '').toLowerCase().replace(/\s+/g, ' ');

  const sortVal = (it: HTMLElement, key: string) => (it.getAttribute(`data-sort-${key}`) ?? '').trim();

  function containerOf(coll: Coll) {
    return coll.order[0]?.parentElement ?? null;
  }

  function apply(coll: Coll, announceIt: boolean) {
    const tokens = coll.q.split(/\s+/).filter(Boolean);
    let shown = 0;
    coll.items.forEach((it) => {
      const hay = searchText(it);
      const hit = tokens.every((t) => hay.includes(t));
      it.classList.toggle('is-hidden', !hit);
      it.toggleAttribute('hidden', !hit);
      it.style.display = hit ? '' : 'none';
      if (hit) shown++;
    });

    /* Sort — stable, so an equal key keeps the authored order. Only ever
       touches the DOM when a key is active (or was, and has been cleared). */
    const box = containerOf(coll);
    if (box && (coll.key || coll.sorted)) {
      const next = coll.order.slice();
      coll.sorted = !!coll.key;
      if (coll.key) {
        next.sort((a, b) => {
          const av = sortVal(a, coll.key);
          const bv = sortVal(b, coll.key);
          const an = Number(av);
          const bn = Number(bv);
          /* Items with no value for this key always land last. */
          if (av === '' !== (bv === '')) return av === '' ? 1 : -1;
          const both = av !== '' && bv !== '' && isFinite(an) && isFinite(bn);
          const cmp = both ? an - bn : av.localeCompare(bv, 'en-IE', { numeric: true, sensitivity: 'base' });
          return cmp * coll.dir;
        });
      }
      next.forEach((it) => box.appendChild(it));
    }

    /* Counts and empty state — readouts usually sit outside the item box,
       so they are matched back to this collection by the same resolver. */
    const total = coll.items.length;
    $$('[data-filter-count]').forEach((c) => {
      if (collFor(c) !== coll) return;
      const tpl = c.dataset.countTemplate;
      c.textContent = tpl
        ? tpl.replace('{n}', String(shown)).replace('{total}', String(total))
        : String(shown);
    });
    $$('[data-filter-empty]').forEach((e) => {
      if (collFor(e) !== coll) return;
      const on = shown === 0;
      e.toggleAttribute('hidden', !on);
      e.classList.toggle('is-shown', on);
    });
    coll.shown = shown;
    if (announceIt) announceCount(coll);
  }

  function announceCount(coll: Coll) {
    announce(
      coll.shown === 0
        ? `No ${coll.noun} match your search.`
        : `${coll.shown} of ${coll.items.length} ${coll.noun} shown.`
    );
  }

  /* -- search ------------------------------------------------------------- */
  $$<HTMLInputElement>('[data-filter-search]').forEach((input) => {
    const coll = collOf(input);
    if (!coll) return;
    input.classList.add('ix-search__input');
    if (!input.getAttribute('type')) input.type = 'search';
    input.setAttribute('autocomplete', 'off');
    let t = 0;
    const run = (announceIt: boolean) => {
      coll.q = input.value.trim().toLowerCase();
      apply(coll, announceIt);
    };
    input.addEventListener('input', () => {
      window.clearTimeout(t);
      run(false);
      /* One settled announcement rather than one per keystroke. */
      t = window.setTimeout(() => announceCount(coll), 500);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && input.value) {
        e.preventDefault();
        input.value = '';
        run(true);
      }
    });
    $$<HTMLButtonElement>('[data-filter-clear]').forEach((clear) => {
      if (collFor(clear) !== coll) return;
      clear.addEventListener('click', () => {
        input.value = '';
        run(true);
        input.focus();
      });
    });
    if (input.value) run(false);
  });

  /* -- sort --------------------------------------------------------------- */
  /** "date" | "-date" | "date:desc" | "" (authored order) */
  function parseSort(raw: string): { key: string; dir: 1 | -1 | 0 } {
    let v = raw.trim();
    let dir: 1 | -1 | 0 = 0;
    if (v.startsWith('-')) {
      dir = -1;
      v = v.slice(1);
    }
    const m = /^(.*?)[:.-](asc|desc)$/i.exec(v);
    if (m) {
      v = m[1];
      dir = m[2].toLowerCase() === 'desc' ? -1 : 1;
    }
    return { key: v, dir };
  }

  $$('[data-sort]').forEach((ctrl) => {
    const coll = collOf(ctrl);
    if (!coll) return;
    ctrl.classList.add('ix-sort');

    if (ctrl instanceof HTMLSelectElement) {
      const run = (announceIt: boolean) => {
        const { key, dir } = parseSort(ctrl.value);
        coll.key = key;
        coll.dir = dir === -1 ? -1 : 1;
        apply(coll, announceIt);
      };
      ctrl.addEventListener('change', () => run(true));
      if (ctrl.value) run(false);
      return;
    }

    /* Button group: siblings share aria-pressed, repeat click flips order. */
    ctrl.addEventListener('click', () => {
      const { key, dir } = parseSort(ctrl.dataset.sort ?? '');
      if (coll.key === key && dir === 0) coll.dir = coll.dir === 1 ? -1 : 1;
      else coll.dir = dir === -1 ? -1 : 1;
      coll.key = key;
      const peers = ctrl.parentElement ? $$('[data-sort]', ctrl.parentElement) : [ctrl];
      peers.forEach((p) => p.setAttribute('aria-pressed', String(p === ctrl)));
      ctrl.setAttribute('data-sort-dir', coll.dir === 1 ? 'asc' : 'desc');
      peers.forEach((p) => {
        if (p !== ctrl) p.removeAttribute('data-sort-dir');
      });
      apply(coll, true);
    });
    if (ctrl.getAttribute('aria-pressed') === 'true') {
      const { key, dir } = parseSort(ctrl.dataset.sort ?? '');
      coll.key = key;
      coll.dir = dir === -1 ? -1 : 1;
    }
  });

  /* -- view toggle -------------------------------------------------------- */
  const viewBtns = $$('[data-view-toggle]');
  if (viewBtns.length) {
    const store = (coll: Coll) => {
      try {
        localStorage.setItem(`ix:view:${coll.storeKey}`, coll.view);
      } catch {
        /* storage blocked — the session still works, it just won't persist */
      }
    };
    const load = (coll: Coll) => {
      try {
        return localStorage.getItem(`ix:view:${coll.storeKey}`) || '';
      } catch {
        return '';
      }
    };

    function setView(coll: Coll, view: string, announceIt: boolean) {
      coll.view = view;
      const box = containerOf(coll);
      const targets = [box, coll.scope instanceof HTMLElement ? coll.scope : null].filter(
        (t): t is HTMLElement => !!t
      );
      /* One state channel: data-view. It doubles as the authored default,
         which is read back below when restoring. */
      targets.forEach((t) => {
        t.dataset.view = view;
      });
      viewBtns.forEach((b) => {
        if (collOf(b) !== coll) return;
        const own = b.dataset.viewToggle || '';
        if (own) b.setAttribute('aria-pressed', String(own === view));
      });
      if (announceIt) announce(view === 'list' ? 'List view' : 'Grid view');
    }

    viewBtns.forEach((btn) => {
      const coll = collOf(btn);
      if (!coll) return;
      btn.classList.add('ix-viewbtn');
      btn.addEventListener('click', () => {
        const own = btn.dataset.viewToggle || '';
        const next = own && own !== 'toggle' ? own : coll.view === 'list' ? 'grid' : 'list';
        setView(coll, next, true);
        store(coll);
      });
    });

    /* Restore the persisted choice, else the authored default. */
    const seen = new Set<Coll>();
    viewBtns.forEach((btn) => {
      const coll = collOf(btn);
      if (!coll || seen.has(coll)) return;
      seen.add(coll);
      const box = containerOf(coll);
      const initial =
        load(coll) ||
        (box?.dataset.view ?? '') ||
        $$('[data-view-toggle][aria-pressed="true"]').find((b) => collOf(b) === coll)?.dataset
          .viewToggle ||
        'grid';
      setView(coll, initial === 'list' ? 'list' : 'grid', false);
    });
  }

  /* First paint: honour any authored sort/search state. */
  colls.forEach((coll) => apply(coll, false));
}
