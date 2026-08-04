// ============================================================
//  motion.ts — scroll-driven + enter-once motion (framework-free)
//  Pairs with motion2.ts (pointer / loop / navigation effects).
//  Every class this file injects is namespaced .mo-* and styled in
//  src/styles/motion.css. Nothing here duplicates a site.ts hook:
//  This file owns [data-counter-to] — the only count-up in the codebase.
//
//  Architecture
//   • ONE rAF frame pipeline for all scroll-driven effects:
//     measure (reads) -> compute (pure maths) -> paint (writes).
//   • ONE IntersectionObserver for all enter-once effects; each
//     element is unobserved the moment it fires.
//   • prefers-reduced-motion: reduce -> final state set immediately,
//     the scroll pipeline never runs.
// ============================================================

import { $, $$, clamp, clamp01, num, prefersReduced, onMotionChange } from './dom';

const html = document.documentElement;
let reduced = prefersReduced();

/* Lets motion.css hide pre-reveal state only when this module is live. */
html.classList.add('mo-js');
if (reduced) html.classList.add('mo-reduced');

const IN = 'mo-in';
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);

/** Layout position in the document, immune to transforms (unlike getBoundingClientRect). */
function docTop(el: HTMLElement): number {
  let t = 0;
  let n: HTMLElement | null = el;
  while (n) {
    t += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return t;
}

/* ---------- Shared scroll pipeline ---------- */
interface ScrollFx {
  measure(): void;                       // DOM reads only
  compute(sy: number, vh: number): void; // maths only, no DOM
  paint(): void;                         // DOM writes only
  reset(): void;                         // drop every inline style we own
}
const scrollFx: ScrollFx[] = [];
let needsMeasure = true;
let frameQueued = false;

function runFrame() {
  frameQueued = false;
  if (reduced || !scrollFx.length) return;
  const vh = innerHeight;
  const sy = scrollY;
  if (needsMeasure) {
    needsMeasure = false;
    for (const fx of scrollFx) fx.measure();
  }
  for (const fx of scrollFx) fx.compute(sy, vh);
  for (const fx of scrollFx) fx.paint();
}
function schedule() {
  if (reduced || frameQueued || !scrollFx.length) return;
  frameQueued = true;
  requestAnimationFrame(runFrame);
}
function remeasure() {
  needsMeasure = true;
  schedule();
}

addEventListener('scroll', schedule, { passive: true });
let resizeTimer = 0;
addEventListener(
  'resize',
  () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(remeasure, 150);
  },
  { passive: true }
);
addEventListener('load', remeasure, { passive: true });
addEventListener('orientationchange', remeasure, { passive: true });
document.fonts?.ready.then(remeasure).catch(() => {});

/* ---------- Shared enter-once observer ---------- */
type Fx = { run: () => void; final: () => void };
const pending = new Map<Element, Fx>();
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const fx = pending.get(e.target);
      io.unobserve(e.target);
      pending.delete(e.target);
      fx?.run();
    }
  },
  { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
);
/** Run `run` once the element scrolls in — or `final` straight away under reduced motion. */
function onEnter(el: Element, run: () => void, final: () => void) {
  if (reduced) {
    final();
    return;
  }
  pending.set(el, { run, final });
  io.observe(el);
}

/* ---------- Shared tween ticker (one loop for every enter-once tween) ---------- */
type Tween = { t0: number; dur: number; step: (eased: number) => void; end?: () => void };
const tweens = new Set<Tween>();
let tweenRaf = 0;
function tickTweens(now: number) {
  tweenRaf = 0;
  for (const tw of Array.from(tweens)) {
    const p = tw.dur > 0 ? clamp01((now - tw.t0) / tw.dur) : 1;
    tw.step(easeOut(p));
    if (p >= 1) {
      tweens.delete(tw);
      tw.end?.();
    }
  }
  if (tweens.size) tweenRaf = requestAnimationFrame(tickTweens);
}
function tween(dur: number, step: (eased: number) => void, end?: () => void) {
  if (reduced) {
    step(1);
    end?.();
    return;
  }
  tweens.add({ t0: performance.now(), dur, step, end });
  if (!tweenRaf) tweenRaf = requestAnimationFrame(tickTweens);
}

/* ---------- Parallax — [data-parallax="0.15"] ---------- */
$$('[data-parallax]').forEach((el) => {
  const speed = num(el.getAttribute('data-parallax'), 0.15);
  const max = Math.abs(num(el.getAttribute('data-parallax-max'), 120));
  el.classList.add('mo-parallax');
  let top = 0;
  let h = 0;
  let y = 0;
  scrollFx.push({
    measure() {
      top = docTop(el);
      h = el.offsetHeight;
    },
    compute(sy, vh) {
      const centre = top + h / 2 - sy; // element centre, in viewport pixels
      y = clamp((vh / 2 - centre) * speed, -max, max);
    },
    paint() {
      el.style.translate = '0 ' + y.toFixed(2) + 'px';
    },
    reset() {
      el.style.translate = '';
    },
  });
});

/* ---------- Scroll scale — [data-scroll-scale] (value = start scale) ---------- */
$$('[data-scroll-scale]').forEach((el) => {
  const from = clamp(num(el.getAttribute('data-scroll-scale'), 0.94), 0.5, 1);
  el.classList.add('mo-scale');
  let top = 0;
  let s = from;
  scrollFx.push({
    measure() {
      top = docTop(el);
    },
    compute(sy, vh) {
      const rectTop = top - sy;
      s = from + (1 - from) * easeOut(clamp01((vh - rectTop) / (vh * 0.62)));
    },
    paint() {
      el.style.scale = s.toFixed(4);
    },
    reset() {
      el.style.scale = '';
    },
  });
});

/* ---------- Scroll tilt + fade — [data-scroll-tilt] (3D card settling flat as it enters view) ---------- */
$$('[data-scroll-tilt]').forEach((el) => {
  const deg = clamp(num(el.getAttribute('data-scroll-tilt'), 50), 0, 80);
  const minOpacity = clamp(num(el.getAttribute('data-scroll-tilt-opacity'), 0.3), 0, 1);
  let top = 0;
  let p = 0;
  scrollFx.push({
    measure() {
      top = docTop(el);
    },
    compute(sy, vh) {
      const rectTop = top - sy;
      p = easeOut(clamp01((vh - rectTop) / (vh * 0.62)));
    },
    paint() {
      el.style.transform = `rotateX(${(deg * (1 - p)).toFixed(2)}deg)`;
      el.style.opacity = (minOpacity + (1 - minOpacity) * p).toFixed(3);
    },
    reset() {
      el.style.transform = '';
      el.style.opacity = '';
    },
  });
});

/* ---------- Word reveal — [data-reveal-words] ---------- */
/* Walks text nodes so nested <strong>/<em>/<span>/<a> markup survives intact. */
function splitWords(host: HTMLElement) {
  if (host.dataset.moSplit) return;
  host.dataset.moSplit = 'words';
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) texts.push(n as Text);

  let i = 0;
  for (const t of texts) {
    const raw = t.nodeValue ?? '';
    if (!raw.trim()) continue;
    const frag = document.createDocumentFragment();
    for (const part of raw.split(/(\s+)/)) {
      if (!part) continue;
      if (!part.trim()) {
        frag.appendChild(document.createTextNode(part)); // keep original whitespace
        continue;
      }
      const outer = document.createElement('span');
      outer.className = 'mo-word';
      const inner = document.createElement('span');
      inner.className = 'mo-word__i';
      inner.style.setProperty('--i', String(i++));
      inner.textContent = part;
      outer.appendChild(inner);
      frag.appendChild(outer);
    }
    t.parentNode?.replaceChild(frag, t);
  }
}
$$('[data-reveal-words]').forEach((host) => {
  host.classList.add('mo-words');
  onEnter(
    host,
    () => {
      splitWords(host);
      host.classList.add(IN);
    },
    () => host.classList.add(IN) // reduced motion: never split, text stays plain and visible
  );
});

/* ---------- Character reveal — [data-reveal-chars] (short labels only) ---------- */
function splitChars(host: HTMLElement) {
  const text = (host.textContent ?? '').trim();
  if (!text || host.dataset.moSplit) return;
  host.dataset.moSplit = 'chars';
  host.textContent = '';
  const sr = document.createElement('span'); // the accessible copy
  sr.className = 'u-sr';
  sr.textContent = text;
  const wrap = document.createElement('span');
  wrap.className = 'mo-chars';
  wrap.setAttribute('aria-hidden', 'true');
  Array.from(text).forEach((ch, i) => {
    if (ch === ' ') {
      wrap.appendChild(document.createTextNode(' '));
      return;
    }
    const s = document.createElement('span');
    s.className = 'mo-char';
    s.style.setProperty('--i', String(i));
    s.textContent = ch;
    wrap.appendChild(s);
  });
  host.append(sr, wrap);
}
$$('[data-reveal-chars]').forEach((host) => {
  host.classList.add('mo-chars-host');
  onEnter(
    host,
    () => {
      splitChars(host);
      host.classList.add(IN);
    },
    () => host.classList.add(IN)
  );
});

/* ---------- Count-up — [data-counter-to] ---------- */
$$('[data-counter-to]').forEach((el) => {
  if (el.dataset.moCounted) return;
  const raw = el.getAttribute('data-counter-to') ?? '0';
  const target = num(raw, 0);
  const decAttr = el.getAttribute('data-counter-dec');
  const decimals = decAttr !== null ? clamp(num(decAttr, 0), 0, 4) : (raw.split('.')[1]?.length ?? 0);
  const pre = el.getAttribute('data-counter-prefix') ?? '';
  const suf = el.getAttribute('data-counter-suffix') ?? '';
  const groupAttr = el.getAttribute('data-counter-group');
  const group = groupAttr !== null ? groupAttr !== 'false' && groupAttr !== '0' : Math.abs(target) >= 10000;
  el.classList.add('mo-count');

  const paint = (v: number) => {
    const body = group
      ? v.toLocaleString('en-IE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : v.toFixed(decimals);
    el.textContent = pre + body + suf;
  };
  const settle = () => {
    el.dataset.moCounted = '1';
    el.classList.add(IN);
    paint(target);
  };
  onEnter(
    el,
    () => {
      el.dataset.moCounted = '1';
      el.classList.add(IN);
      tween(1200, (e) => paint(target * e), () => paint(target));
    },
    settle
  );
});

/* ---------- Bar grow — [data-bar-to="80"] wrapping .mo-bar__fill ---------- */
$$('[data-bar-to]').forEach((host) => {
  const fill = $<HTMLElement>('.mo-bar__fill', host);
  if (!fill) return;
  const to = clamp(num(host.getAttribute('data-bar-to'), 0), 0, 100);
  host.classList.add('mo-bar');
  if (host.getAttribute('role') === 'progressbar') {
    host.setAttribute('aria-valuemin', '0');
    host.setAttribute('aria-valuemax', '100');
    host.setAttribute('aria-valuenow', String(Math.round(to))); // final value, announced once
  }
  const paint = (p: number) => {
    const v = to * p;
    fill.style.width = v.toFixed(2) + '%';
  };
  paint(0);
  onEnter(
    host,
    () => {
      host.classList.add(IN);
      tween(900, paint, () => paint(1));
    },
    () => {
      host.classList.add(IN);
      paint(1);
    }
  );
});

/* ---------- Progress ring — [data-progress-ring] + data-progress="72" ---------- */
const RING_R = 54;
$$('[data-progress-ring]').forEach((host) => {
  const val = clamp(num(host.getAttribute('data-progress'), 0), 0, 100);
  const suffix = host.getAttribute('data-progress-suffix') ?? '%';
  host.classList.add('mo-ring');

  let bar = $<SVGCircleElement>('.mo-ring__bar', host);
  let out = $<HTMLElement>('[data-ring-val], .mo-ring__val', host);
  if (!bar) {
    host.insertAdjacentHTML(
      'afterbegin',
      '<svg class="mo-ring__svg" viewBox="0 0 120 120" aria-hidden="true" focusable="false">' +
        `<circle class="mo-ring__track" cx="60" cy="60" r="${RING_R}" fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="9"/>` +
        `<circle class="mo-ring__bar" cx="60" cy="60" r="${RING_R}" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round" transform="rotate(-90 60 60)"/>` +
        '</svg>'
    );
    bar = $<SVGCircleElement>('.mo-ring__bar', host);
    if (!out && host.getAttribute('data-progress-ring') !== 'bare') {
      const span = document.createElement('span');
      span.className = 'mo-ring__val';
      host.appendChild(span);
      out = span;
    }
  }
  if (!bar) return;
  if (!out && !host.hasAttribute('aria-label')) {
    host.setAttribute('role', 'img');
    host.setAttribute('aria-label', host.getAttribute('data-progress-label') ?? val + suffix);
  }

  const circ = 2 * Math.PI * RING_R;
  bar.style.strokeDasharray = circ.toFixed(2);
  const ring = bar;
  const paint = (p: number) => {
    const v = val * p;
    ring.style.strokeDashoffset = (circ * (1 - v / 100)).toFixed(2);
    if (out) out.textContent = Math.round(v) + suffix;
  };
  paint(0);
  onEnter(
    host,
    () => {
      host.classList.add(IN);
      tween(1100, paint, () => paint(1));
    },
    () => {
      host.classList.add(IN);
      paint(1);
    }
  );
});

/* ---------- Honour a live change of the motion preference ---------- */
onMotionChange((isReduced) => {
  reduced = isReduced;
  html.classList.toggle('mo-reduced', reduced);
  if (!reduced) {
    remeasure();
    return;
  }
  for (const tw of Array.from(tweens)) {
    tw.step(1);
    tw.end?.();
  }
  tweens.clear();
  if (tweenRaf) {
    cancelAnimationFrame(tweenRaf);
    tweenRaf = 0;
  }
  for (const [el, fx] of Array.from(pending)) {
    io.unobserve(el);
    pending.delete(el);
    fx.final();
  }
  for (const fx of scrollFx) fx.reset();
});

/* First frame: place every scroll-driven element for the current scroll position. */
schedule();
