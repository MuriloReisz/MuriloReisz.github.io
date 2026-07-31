// ============================================================
//  dom.ts — the helpers every client module needs.
//
//  The six entry modules loaded by Layout.astro (site, motion,
//  motion2, widgets, demos, home) stay side-effect modules with no
//  exports of their own; this is the one place they import from, so
//  the query helpers, clamps, number formats and the reduced-motion
//  signal exist once rather than six times.
//
//  Locale note: en-IE throughout — the site prices in € and writes
//  dates European-style, so the formatters must agree.
// ============================================================

export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) =>
  r.querySelector<T>(s);

export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) =>
  Array.from(r.querySelectorAll<T>(s));

/* ---------- Maths ---------- */
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v: number) => clamp(v, 0, 1);

/** Parses an attribute to a number, falling back when absent or unparseable. */
export const num = (v: string | null | undefined, fallback: number) => {
  const n = Number.parseFloat(v ?? '');
  return Number.isFinite(n) ? n : fallback;
};

/* ---------- Reduced motion ----------
   One MediaQueryList for the whole client. prefersReduced() is read
   live rather than snapshotted, so a module that checks it mid-session
   sees the current value; onMotionChange lets a module re-render. */
const motionMQ = matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReduced = () => motionMQ.matches;
export const onMotionChange = (fn: (reduced: boolean) => void) =>
  motionMQ.addEventListener('change', (e) => fn(e.matches));

/* ---------- Timing ---------- */
export const debounce = (fn: () => void, wait = 160) => {
  let t = 0;
  return () => {
    clearTimeout(t);
    t = window.setTimeout(fn, wait);
  };
};

/* ---------- Number formatting ----------
   Built on first use, not at import: 12 of the 15 pages never format a
   number, and eagerly constructing Intl instances is the most expensive
   thing a module can do at import time. The `.format(v)` shape is kept
   so call sites read like a plain Intl.NumberFormat. */
const cache = new Map<string, Intl.NumberFormat>();
const resolve = (key: string, opts: Intl.NumberFormatOptions) => {
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-IE', opts);
    cache.set(key, f);
  }
  return f;
};
const lazy = (key: string, opts: Intl.NumberFormatOptions) => ({
  format: (v: number) => resolve(key, opts).format(v),
});

export const int0 = lazy('int0', { maximumFractionDigits: 0 });
export const dec1 = lazy('dec1', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const dec2 = lazy('dec2', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur0 = lazy('eur0', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});
export const eur2 = lazy('eur2', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
});
/** Fixed decimal places, for chart tick labels and counters. */
export const decN = (dec: number) =>
  lazy(`dec${dec}`, { minimumFractionDigits: dec, maximumFractionDigits: dec });

