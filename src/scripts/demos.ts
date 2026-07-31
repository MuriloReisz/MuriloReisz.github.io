// ============================================================
//  demos.ts — the /playground demos (framework-free, no deps)
//  Pairs with widgets.ts (presentation widgets) and motion*.ts.
//  Every class this file injects is namespaced .pg-* (demo shells)
//  or .ix-* (shared primitives: readouts, status, visually-hidden).
//
//  Hooks owned here — nothing else in the codebase touches them:
//    [data-roi-calc]       ROI / time-saved calculator
//    [data-kpi-explorer]   segmented control that swaps a chart series
//    [data-sql-play]       canned SQL console
//    [data-churn-demo]     weighted churn scorer -> [data-progress-ring]
//    [data-forecast-demo]  horizon slider -> actual vs forecast + band
//    [data-pipeline-demo]  click-to-run ETL visual with a log feed
//
//  House rules honoured
//   • Every hook is presence-checked, so this module is inert on
//     pages that do not use it.
//   • Real <input type="range"> / <button aria-pressed>; results land
//     in a polite live region; reduced motion completes instantly.
//   • The markup may omit min/max/value/aria-label on a slider — the
//     binder fills in sane defaults so a demo can never render dead.
// ============================================================

import { $, $$, clamp, clamp01, num, debounce, prefersReduced, int0, dec1, dec2, eur0, eur2 } from './dom';

/* ---------- Formatting (en-IE, € — see house rules) ---------- */
const money = (v: number) => (Math.abs(v) < 10 && v !== 0 ? eur2 : eur0).format(v);
const EM_DASH = '—';

/* ---------- Field binding ------------------------------------
   Maps the real range inputs inside a demo onto named fields.
   Every range input in the codebase declares its own key in
   data-<ns>-in, so identity is a direct attribute read. Missing
   min/max/step/value/aria-label are filled from the field spec.
------------------------------------------------------------- */
type Field = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  def: number;
  /** Human-readable value, also used for aria-valuetext. */
  fmt?: (v: number) => string;
};

function bindFields(root: HTMLElement, attr: string, fields: Field[]): Map<string, HTMLInputElement> {
  const map = new Map<string, HTMLInputElement>();
  $$<HTMLInputElement>(`input[type="range"][${attr}]`, root).forEach((i) => {
    const key = (i.getAttribute(attr) || '').trim();
    if (key && !map.has(key)) map.set(key, i);
  });

  // Normalise each control so it is usable and announced properly. A field with
  // no input simply keeps its default (e.g. /services omits `weeks`).
  fields.forEach((f) => {
    const i = map.get(f.key);
    if (!i) return;
    if (!i.hasAttribute('min')) i.min = String(f.min);
    if (!i.hasAttribute('max')) i.max = String(f.max);
    if (!i.hasAttribute('step')) i.step = String(f.step);
    if (!i.hasAttribute('value')) i.value = String(f.def);
    if (!i.getAttribute('aria-label') && !i.labels?.length) i.setAttribute('aria-label', f.label);
  });
  return map;
}

/** Reads a bound field, clamped to its own min/max. */
const val = (map: Map<string, HTMLInputElement>, key: string, fallback: number) => {
  const i = map.get(key);
  if (!i) return fallback;
  const v = num(i.value, fallback);
  return clamp(v, num(i.min, -Infinity), num(i.max, Infinity));
};

/** Writes every `[data-<ns>-out="key"]` / `[data-<ns>-val="key"]` target. */
function paintOuts(root: HTMLElement, attr: string, values: Record<string, string>) {
  $$(`[${attr}]`, root).forEach((el) => {
    const k = el.getAttribute(attr) ?? '';
    if (k in values) el.textContent = values[k];
  });
}

/** Mirrors each slider’s current value into its readout + aria-valuetext. */
function paintFieldReadouts(
  root: HTMLElement,
  map: Map<string, HTMLInputElement>,
  fields: Field[],
  valAttr: string
) {
  fields.forEach((f) => {
    const i = map.get(f.key);
    if (!i) return;
    const text = f.fmt ? f.fmt(num(i.value, f.def)) : int0.format(num(i.value, f.def));
    i.setAttribute('aria-valuetext', text);
    const out =
      $(`[${valAttr}="${f.key}"]`, root) ||
      (i.id ? $<HTMLElement>(`output[for="${i.id}"]`, root) : null);
    if (out) out.textContent = text;
  });
}

/** One polite status line per demo — created (SR-only) if the markup has none. */
function statusRegion(root: HTMLElement, attr: string): HTMLElement {
  let el = $<HTMLElement>(`[${attr}]`, root);
  if (!el) {
    el = document.createElement('p');
    el.className = 'u-sr';
    el.setAttribute(attr, '');
    root.appendChild(el);
  }
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  return el;
}

/** Per-demo init that cannot take the rest of the module down with it. */
function each(sel: string, fn: (root: HTMLElement) => void) {
  $$(sel).forEach((root) => {
    try {
      fn(root);
    } catch (err) {
      console.warn(`[demos] ${sel} did not start`, err);
    }
  });
}

/** Resolves a selector held in an attribute, tolerating a bad one. */
function pick(sel: string | null): HTMLElement | null {
  if (!sel) return null;
  try {
    return $<HTMLElement>(sel);
  } catch {
    return null;
  }
}

/* ============================================================
   ROI calculator — [data-roi-calc]
   annual hours  = hours/week × people × working weeks
   hours saved   = annual hours × automation share
   annual saving = hours saved × hourly cost
   payback       = investment ÷ monthly saving
   ============================================================ */
const ROI_FIELDS: Field[] = [
  { key: 'hours', label: 'Hours each person spends on manual reporting per week', min: 1, max: 30, step: 0.5, def: 6, fmt: (v) => `${dec1.format(v)} h/week` },
  { key: 'people', label: 'People doing that work', min: 1, max: 40, step: 1, def: 4, fmt: (v) => `${int0.format(v)} ${v === 1 ? 'person' : 'people'}` },
  { key: 'weeks', label: 'Working weeks per year', min: 20, max: 52, step: 1, def: 46, fmt: (v) => `${int0.format(v)} weeks` },
  { key: 'rate', label: 'Fully loaded hourly cost', min: 15, max: 120, step: 1, def: 38, fmt: (v) => `${money(v)}/h` },
  { key: 'share', label: 'Share of that work automation removes', min: 10, max: 95, step: 5, def: 70, fmt: (v) => `${int0.format(v)}%` },
  { key: 'invest', label: 'One-off build cost', min: 1500, max: 25000, step: 500, def: 6500, fmt: (v) => money(v) },
];

each('[data-roi-calc]', (root) => {
  const map = bindFields(root, 'data-roi-in', ROI_FIELDS);
  if (!map.size) return;
  const status = statusRegion(root, 'data-roi-status');
  let lastSentence = '';
  let live = false; // stays quiet until the visitor actually moves something
  /* One settled announcement rather than one per slider tick. */
  const announce = debounce(() => {
    if (live) status.textContent = lastSentence;
  }, 500);

  const render = () => {
    const hours = val(map, 'hours', 6);
    const people = val(map, 'people', 4);
    const weeks = val(map, 'weeks', 46);
    const rate = val(map, 'rate', 38);
    const share = clamp01(val(map, 'share', 70) / 100);
    const invest = val(map, 'invest', 6500);

    const annualHours = hours * people * weeks;
    const savedHours = annualHours * share;
    const annualSaving = savedHours * rate;
    const monthly = annualSaving / 12;
    const paybackMonths = monthly > 0 ? invest / monthly : Infinity;
    const payback = !Number.isFinite(paybackMonths)
      ? EM_DASH
      : paybackMonths < 1
        ? 'under a month'
        : `${dec1.format(paybackMonths)} months`;

    paintOuts(root, 'data-roi-out', {
      annual: money(annualSaving),
      saving: money(annualSaving),
      monthly: money(monthly),
      hours: `${int0.format(Math.round(savedHours))} h`,
      hoursword: `${int0.format(Math.round(savedHours))} hours`,
      baseline: `${int0.format(Math.round(annualHours))} h`,
      cost: money(annualHours * rate),
      invest: money(invest),
      payback,
      days: `${int0.format(Math.round(savedHours / 7.5))} working days`,
      formula:
        `${dec1.format(hours)} h/week × ${int0.format(people)} ${people === 1 ? 'person' : 'people'} × ` +
        `${int0.format(weeks)} weeks × ${money(rate)}/h × ${int0.format(share * 100)}% = ${money(annualSaving)}/year`,
      paybackformula:
        monthly > 0 ? `${money(invest)} ÷ ${money(monthly)}/month = ${payback}` : EM_DASH,
    });
    paintFieldReadouts(root, map, ROI_FIELDS, 'data-roi-val');

    lastSentence =
      `${money(annualSaving)} a year back, ${int0.format(Math.round(savedHours))} hours returned to the team, ` +
      `payback ${payback === EM_DASH ? 'not reached' : payback}.`;
    announce();
  };

  root.addEventListener('input', (e) => {
    if ((e.target as HTMLElement)?.matches('input')) {
      live = true;
      render();
    }
  });
  render();
});

/* ============================================================
   KPI explorer — [data-kpi-explorer]
   A segmented control of <button data-kpi="…" aria-pressed> swaps the
   series of the bound widgets.ts chart. The chart is found inside the
   explorer, or via data-kpi-target="#id". We hand data over the
   documented contract: rewrite data-series, then dispatch the
   bubbling CustomEvent('chart:update') that widgets.ts listens for
   (a second alias, 'ix:chart-update', is fired for safety).
   Markup may override any series with data-kpi-series='[…]'.
   ============================================================ */
type Datum = { label: string; value: number };
type Kpi = {
  series: Datum[];
  type?: 'bar' | 'line' | 'donut';
  value: string;
  delta: string;
  dir: 'up' | 'down';
  note: string;
  unit?: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ser = (values: number[], labels: string[] = MONTHS): Datum[] =>
  values.map((v, i) => ({ label: labels[i % labels.length], value: v }));

const KPIS: Record<string, Kpi> = {
  revenue: {
    series: ser([412, 438, 466, 451, 494, 528, 547, 561, 598, 634, 671, 712]),
    type: 'line',
    value: '€712k',
    delta: '+18.4%',
    dir: 'up',
    note: 'Monthly booked revenue, twelve months to December. Growth is compounding from the two paid channels, not from discounting.',
    unit: '€k',
  },
  orders: {
    series: ser([1840, 1902, 2064, 1988, 2140, 2288, 2361, 2402, 2544, 2678, 2790, 2912]),
    type: 'bar',
    value: '2,912',
    delta: '+12.1%',
    dir: 'up',
    note: 'Orders per month. The April dip is the Easter shipping pause, not a demand problem — it recovers within one cycle.',
  },
  aov: {
    series: ser([224, 230, 226, 227, 231, 231, 232, 234, 235, 237, 241, 245]),
    type: 'line',
    value: '€245',
    delta: '+9.4%',
    dir: 'up',
    note: 'Average order value. Bundling two accessories at checkout moved this €21 without touching list prices.',
    unit: '€',
  },
  retention: {
    series: ser([100, 68, 54, 47, 43, 40, 38, 37, 36, 35, 35, 34], ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11']),
    type: 'line',
    value: '34%',
    delta: '+6 pts',
    dir: 'up',
    note: 'Cohort retention by month since first order. The curve flattens from month six — that plateau is the number worth defending.',
    unit: '%',
  },
  margin: {
    series: ser([38.2, 38.8, 39.1, 38.4, 39.6, 40.2, 40.5, 41.1, 41.4, 41.9, 42.3, 43.1]),
    type: 'bar',
    value: '43.1%',
    delta: '+4.9 pts',
    dir: 'up',
    note: 'Contribution margin after fulfilment and ad spend. Renegotiated carrier rates account for roughly half the gain.',
    unit: '%',
  },
  channels: {
    series: [
      { label: 'Organic search', value: 34 },
      { label: 'Paid social', value: 26 },
      { label: 'Email', value: 18 },
      { label: 'Direct', value: 14 },
      { label: 'Referral', value: 8 },
    ],
    type: 'donut',
    value: '5 channels',
    delta: '34% organic',
    dir: 'up',
    note: 'Share of attributed revenue by channel. Organic overtook paid social in the second quarter and has held the lead since.',
    unit: '%',
  },
  churn: {
    series: ser([4.1, 3.9, 4.0, 3.6, 3.4, 3.3, 3.1, 3.0, 2.8, 2.7, 2.6, 2.4]),
    type: 'line',
    value: '2.4%',
    delta: '−1.7 pts',
    dir: 'down',
    note: 'Monthly logo churn. The win came from acting on the risk score early, not from a save-desk discount.',
    unit: '%',
  },
  conversion: {
    series: ser([1.82, 1.9, 2.04, 1.96, 2.11, 2.24, 2.3, 2.38, 2.46, 2.55, 2.68, 2.81]),
    type: 'bar',
    value: '2.81%',
    delta: '+54%',
    dir: 'up',
    note: 'Session-to-order conversion. Fixing the mobile basket step is the single largest contributor.',
    unit: '%',
  },
};

/** Deterministic, plausible fallback so an unknown key never renders blank. */
function fallbackKpi(key: string): Kpi {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 9973;
  const base = 40 + (h % 60);
  const values = MONTHS.map((_, i) => {
    h = (h * 1103515245 + 12345) % 2147483647;
    return Math.round((base + i * (base / 18) + ((h % 100) / 100 - 0.5) * (base / 9)) * 10) / 10;
  });
  const growth = ((values[11] - values[0]) / values[0]) * 100;
  return {
    series: ser(values),
    type: 'line',
    value: int0.format(values[11]),
    delta: `${growth >= 0 ? '+' : '−'}${dec1.format(Math.abs(growth))}%`,
    dir: growth >= 0 ? 'up' : 'down',
    note: 'Twelve months of monthly values, indexed to the first full month of tracking.',
  };
}

each('[data-kpi-explorer]', (root) => {
  const btns = $$<HTMLButtonElement>('[data-kpi]', root);
  if (!btns.length) return;
  const chart = pick(root.getAttribute('data-kpi-target')) ?? $<HTMLElement>('[data-chart]', root);
  const status = statusRegion(root, 'data-kpi-status');

  const show = (btn: HTMLButtonElement, announce: boolean) => {
    const key = (btn.getAttribute('data-kpi') || '').trim();
    const name = (btn.getAttribute('data-kpi-label') || btn.textContent || key).trim();
    let kpi: Kpi = KPIS[key.toLowerCase()] ?? fallbackKpi(key || name);
    const override = btn.getAttribute('data-kpi-series');
    if (override) {
      try {
        const parsed = JSON.parse(override) as Datum[];
        if (Array.isArray(parsed) && parsed.length) kpi = { ...kpi, series: parsed };
      } catch {
        /* keep the built-in series if the override is not valid JSON */
      }
    }

    btns.forEach((b) => {
      const on = b === btn;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-active', on);
    });

    if (chart) {
      chart.setAttribute('data-series', JSON.stringify(kpi.series));
      const type = btn.getAttribute('data-kpi-type') ?? kpi.type;
      if (type) chart.setAttribute('data-chart', type);
      if (kpi.unit) chart.setAttribute('data-chart-unit', kpi.unit);
      chart.setAttribute('data-chart-title', name);
      chart.dispatchEvent(new CustomEvent('chart:update', { bubbles: true, detail: { series: kpi.series, type, key } }));
      chart.dispatchEvent(new CustomEvent('ix:chart-update', { bubbles: true, detail: { series: kpi.series, type, key } }));
    }

    paintOuts(root, 'data-kpi-out', {
      value: kpi.value,
      delta: kpi.delta,
      note: kpi.note,
      name,
      label: name,
      dir: kpi.dir === 'up' ? 'Rising' : 'Falling',
    });
    const deltaEl = $<HTMLElement>('[data-kpi-out="delta"]', root);
    if (deltaEl) {
      deltaEl.classList.toggle('pg-kpi__delta--up', kpi.dir === 'up');
      deltaEl.classList.toggle('pg-kpi__delta--down', kpi.dir === 'down');
    }
    if (announce) status.textContent = `${name}: ${kpi.value}, ${kpi.delta}. ${kpi.note}`;
  };

  btns.forEach((b) => {
    if (!b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => show(b, true));
  });
  show(btns.find((b) => b.getAttribute('aria-pressed') === 'true') ?? btns[0], false);
});

/* ============================================================
   SQL console — [data-sql-play]
   A read-only sandbox over four canned tables. Queries are matched
   case- and whitespace-insensitively (comments and trailing
   semicolons stripped), so a re-typed query still resolves. Anything
   unrecognised gets a specific message naming what went wrong.
   ============================================================ */
type Col = { key: string; label: string; type: 'text' | 'num' | 'eur' | 'pct' | 'dec' };
type Canned = {
  id: string;
  title: string;
  sql: string;
  cols: Col[];
  rows: (string | number | null)[][];
  note?: string;
  match: (n: string) => boolean;
};

const SQL_TABLES = ['orders', 'customer_monthly', 'inventory_health', 'campaigns'];

/** lower-case, comment-free, single-spaced, semicolon-free. */
function normaliseSql(raw: string): string {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/[`"]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/([a-z0-9_]) +\(/g, '$1(')
    .replace(/\( +/g, '(')
    .replace(/ +\)/g, ')')
    .replace(/ *, */g, ', ')
    .replace(/;+\s*$/, '')
    .trim();
}
const has = (n: string, ...bits: string[]) => bits.every((b) => n.includes(b));

const SQL_CANNED: Canned[] = [
  {
    id: 'channels',
    title: 'Revenue by channel, 2025 year to date',
    sql: `SELECT channel,
       SUM(revenue) AS revenue,
       COUNT(*)     AS orders
FROM orders
WHERE order_date >= '2025-01-01'
GROUP BY channel
ORDER BY revenue DESC
LIMIT 5;`,
    cols: [
      { key: 'channel', label: 'channel', type: 'text' },
      { key: 'revenue', label: 'revenue', type: 'eur' },
      { key: 'orders', label: 'orders', type: 'num' },
    ],
    rows: [
      ['Organic search', 241880, 1042],
      ['Paid social', 184220, 812],
      ['Email', 126470, 549],
      ['Direct', 98150, 402],
      ['Referral', 61240, 268],
    ],
    note: 'Organic search carries the year: 31% of orders and 33% of revenue, with no media cost behind it.',
    match: (n) => has(n, 'orders', 'channel') && has(n, 'sum') && n.includes('group by'),
  },
  {
    id: 'repeat',
    title: 'Repeat-purchase rate by month',
    sql: `SELECT month,
       customers,
       repeat_customers,
       ROUND(100.0 * repeat_customers / customers, 1) AS repeat_rate
FROM customer_monthly
ORDER BY month;`,
    cols: [
      { key: 'month', label: 'month', type: 'text' },
      { key: 'customers', label: 'customers', type: 'num' },
      { key: 'repeat_customers', label: 'repeat_customers', type: 'num' },
      { key: 'repeat_rate', label: 'repeat_rate', type: 'pct' },
    ],
    rows: [
      ['2025-07', 1904, 512, 26.9],
      ['2025-08', 1962, 559, 28.5],
      ['2025-09', 2088, 623, 29.8],
      ['2025-10', 2174, 681, 31.3],
      ['2025-11', 2296, 748, 32.6],
      ['2025-12', 2412, 818, 33.9],
    ],
    note: 'Seven points of repeat-rate growth in six months, driven by the post-delivery email sequence.',
    match: (n) => n.includes('customer_monthly') || has(n, 'repeat', 'select'),
  },
  {
    id: 'stock',
    title: 'Slowest-moving SKUs',
    sql: `SELECT sku, product, stock_days, units_30d
FROM inventory_health
WHERE stock_days > 60
ORDER BY stock_days DESC
LIMIT 6;`,
    cols: [
      { key: 'sku', label: 'sku', type: 'text' },
      { key: 'product', label: 'product', type: 'text' },
      { key: 'stock_days', label: 'stock_days', type: 'num' },
      { key: 'units_30d', label: 'units_30d', type: 'num' },
    ],
    rows: [
      ['GS-4180', 'Glass carafe, 1.2 L', 214, 3],
      ['LN-2260', 'Linen runner, sand', 186, 5],
      ['CR-0915', 'Ceramic tray, ash', 151, 8],
      ['WD-7742', 'Walnut board, large', 128, 11],
      ['ST-3301', 'Steel tin, set of 3', 97, 14],
      ['BR-5518', 'Brass hook, single', 71, 22],
    ],
    note: '€38k of stock value sits in these six lines. Two of them have never been in a campaign.',
    match: (n) => n.includes('inventory_health') || has(n, 'stock_days'),
  },
  {
    id: 'roas',
    title: 'Campaign efficiency',
    sql: `SELECT campaign, spend, revenue,
       ROUND(revenue / spend, 2) AS roas
FROM campaigns
ORDER BY roas DESC;`,
    cols: [
      { key: 'campaign', label: 'campaign', type: 'text' },
      { key: 'spend', label: 'spend', type: 'eur' },
      { key: 'revenue', label: 'revenue', type: 'eur' },
      { key: 'roas', label: 'roas', type: 'dec' },
    ],
    rows: [
      ['Retargeting — viewed basket', 8420, 61460, 7.3],
      ['Search — brand', 6180, 38320, 6.2],
      ['Email — winback', 1240, 6820, 5.5],
      ['Search — generic', 14900, 41720, 2.8],
      ['Social — prospecting', 22600, 38420, 1.7],
      ['Display — awareness', 9800, 7840, 0.8],
    ],
    note: 'Display awareness has never returned its spend. Moving that budget to retargeting is the cheapest win on the sheet.',
    match: (n) => n.includes('campaigns') || n.includes('roas'),
  },
  {
    id: 'sample',
    title: 'First rows of orders',
    sql: 'SELECT * FROM orders LIMIT 5;',
    cols: [
      { key: 'order_id', label: 'order_id', type: 'text' },
      { key: 'order_date', label: 'order_date', type: 'text' },
      { key: 'channel', label: 'channel', type: 'text' },
      { key: 'customer_id', label: 'customer_id', type: 'text' },
      { key: 'revenue', label: 'revenue', type: 'eur' },
    ],
    rows: [
      ['ORD-104821', '2025-12-02', 'Organic search', 'CUS-2841', 218.4],
      ['ORD-104822', '2025-12-02', 'Email', 'CUS-1190', 96.5],
      ['ORD-104823', '2025-12-03', 'Paid social', 'CUS-3377', 341.0],
      ['ORD-104824', '2025-12-03', 'Direct', 'CUS-0928', 129.9],
      ['ORD-104825', '2025-12-04', 'Organic search', 'CUS-4415', 274.25],
    ],
    match: (n) => /^select \*(, ?\*)? from orders( limit \d+)?$/.test(n),
  },
  {
    id: 'count',
    title: 'Row count',
    sql: 'SELECT COUNT(*) AS orders FROM orders;',
    cols: [{ key: 'orders', label: 'orders', type: 'num' }],
    rows: [[12438]],
    match: (n) => /^select count\(\*?\)( as \w+)? from orders$/.test(n),
  },
  {
    id: 'tables',
    title: 'Tables in this sandbox',
    sql: 'SHOW TABLES;',
    cols: [
      { key: 'table_name', label: 'table_name', type: 'text' },
      { key: 'rows', label: 'rows', type: 'num' },
      { key: 'grain', label: 'grain', type: 'text' },
    ],
    rows: [
      ['orders', 12438, 'one row per order'],
      ['customer_monthly', 72, 'one row per month'],
      ['inventory_health', 486, 'one row per SKU'],
      ['campaigns', 6, 'one row per campaign'],
    ],
    match: (n) => n === 'show tables' || n === '\\dt' || has(n, 'information_schema'),
  },
];

function fmtCell(v: string | number | null, type: Col['type']): string {
  if (v === null || v === undefined || v === '') return EM_DASH;
  if (typeof v === 'number') {
    if (type === 'eur') return money(v);
    if (type === 'pct') return `${dec1.format(v)}%`;
    if (type === 'dec') return dec2.format(v);
    return int0.format(v);
  }
  return String(v);
}

function sqlTable(c: Canned): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'pg-sql__result';
  const scroll = document.createElement('div');
  scroll.className = 'pg-sql__scroll';
  const table = document.createElement('table');
  table.className = 'pg-sql__table';

  const cap = document.createElement('caption');
  cap.className = 'u-sr';
  cap.textContent = `${c.title} — ${c.rows.length} ${c.rows.length === 1 ? 'row' : 'rows'}`;
  table.appendChild(cap);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  c.cols.forEach((col) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = col.type === 'text' ? 'pg-sql__th' : 'pg-sql__th pg-sql__num';
    th.textContent = col.label;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  c.rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.className = 'pg-sql__row';
    c.cols.forEach((col, i) => {
      const td = document.createElement('td');
      td.className = col.type === 'text' ? 'pg-sql__td' : 'pg-sql__td pg-sql__num';
      td.textContent = fmtCell(row[i] ?? null, col.type);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  scroll.appendChild(table);
  wrap.appendChild(scroll);

  if (c.note) {
    const note = document.createElement('p');
    note.className = 'pg-sql__note';
    note.textContent = c.note;
    wrap.appendChild(note);
  }
  return wrap;
}

function sqlMessage(text: string, hint?: string): HTMLElement {
  const p = document.createElement('div');
  p.className = 'pg-sql__msg';
  const main = document.createElement('p');
  main.className = 'pg-sql__msg-text';
  main.textContent = text;
  p.appendChild(main);
  if (hint) {
    const h = document.createElement('p');
    h.className = 'pg-sql__msg-hint';
    h.textContent = hint;
    p.appendChild(h);
  }
  return p;
}

/** Specific, friendly diagnosis for anything not in the canned set. */
function diagnose(n: string, raw: string): { text: string; hint?: string } {
  if (!raw.trim()) return { text: 'Nothing to run yet.', hint: 'Type a query, or load one of the three examples below.' };
  const verb = (n.match(/^[a-z]+/) ?? [''])[0];
  const writes = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create', 'grant', 'merge'];
  if (writes.includes(verb)) {
    return {
      text: `This sandbox is read-only, so ${verb.toUpperCase()} is switched off.`,
      hint: 'The warehouse role behind it only holds SELECT anyway — that is how the real one is set up.',
    };
  }
  if (verb && verb !== 'select' && verb !== 'with' && verb !== 'show') {
    return {
      text: `“${verb}” is not a statement this console knows.`,
      hint: 'It handles SELECT (optionally with a leading WITH), plus SHOW TABLES.',
    };
  }
  if (verb === 'select' && !n.includes('from')) {
    return {
      text: 'That SELECT has no FROM clause, so there is nothing to read.',
      hint: `Add one of: ${SQL_TABLES.join(', ')}.`,
    };
  }
  const named = Array.from(n.matchAll(/from ([a-z_][a-z0-9_]*)/g)).map((m) => m[1]);
  const unknown = named.find((t) => !SQL_TABLES.includes(t));
  if (unknown) {
    return {
      text: `There is no table called “${unknown}” in this sandbox.`,
      hint: `Four tables are loaded: ${SQL_TABLES.join(', ')}. Run SHOW TABLES to see their grain.`,
    };
  }
  if (named.length) {
    return {
      text: `“${named[0]}” exists, but this console has no canned result for that exact projection.`,
      hint: 'It answers the three example queries below, SELECT * FROM orders LIMIT 5, SELECT COUNT(*) FROM orders and SHOW TABLES. Everything else needs the live warehouse.',
    };
  }
  return {
    text: 'That one did not parse.',
    hint: `Try one of the examples, or SHOW TABLES to see what is loaded.`,
  };
}

each('[data-sql-play]', (root) => {
  const input = $<HTMLTextAreaElement>('[data-sql-input]', root) ?? $<HTMLTextAreaElement>('textarea', root);
  const out = $<HTMLElement>('[data-sql-out]', root);
  if (!input || !out) return;
  const runBtn =
    $<HTMLButtonElement>('[data-sql-run]', root) ??
    $$<HTMLButtonElement>('button', root).find((b) => /run/i.test(b.textContent || '')) ??
    null;
  const clearBtn = $<HTMLButtonElement>('[data-sql-clear]', root);
  const meta = $<HTMLElement>('[data-sql-meta]', root);
  const status = statusRegion(root, 'data-sql-status');
  out.setAttribute('aria-live', 'polite');
  out.setAttribute('aria-atomic', 'true');

  const paint = (node: HTMLElement) => {
    out.textContent = '';
    out.appendChild(node);
  };

  const run = () => {
    const raw = input.value;
    const n = normaliseSql(raw);
    const hit = SQL_CANNED.find((c) => n === normaliseSql(c.sql) || c.match(n));
    const settle = () => {
      root.removeAttribute('aria-busy');
      if (hit) {
        paint(sqlTable(hit));
        const rows = `${hit.rows.length} ${hit.rows.length === 1 ? 'row' : 'rows'}`;
        const ms = 18 + ((hit.rows.length * 7) % 40);
        if (meta) meta.textContent = `${rows} · ${ms} ms`;
        status.textContent = `${rows} returned. ${hit.title}.`;
      } else {
        const d = diagnose(n, raw);
        paint(sqlMessage(d.text, d.hint));
        if (meta) meta.textContent = 'no rows';
        status.textContent = `${d.text} ${d.hint ?? ''}`.trim();
      }
    };
    if (prefersReduced()) settle();
    else {
      root.setAttribute('aria-busy', 'true');
      if (meta) meta.textContent = 'running…';
      setTimeout(settle, 240);
    }
  };

  runBtn?.addEventListener('click', run);
  input.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });
  clearBtn?.addEventListener('click', () => {
    input.value = '';
    out.textContent = '';
    if (meta) meta.textContent = '';
    status.textContent = 'Console cleared.';
    input.focus();
  });

  // Example buttons: query from data-sql-query, else the canned set in order.
  $$<HTMLButtonElement>('[data-sql-example]', root).forEach((b, i) => {
    const named = (b.getAttribute('data-sql-example') || '').trim().toLowerCase();
    const canned = SQL_CANNED.find((c) => c.id === named) ?? SQL_CANNED[i % SQL_CANNED.length];
    const sql = b.getAttribute('data-sql-query') || canned.sql;
    b.addEventListener('click', () => {
      input.value = sql;
      input.focus();
      status.textContent = `Loaded the query for ${canned.title.toLowerCase()}. Press Run to execute it.`;
    });
  });
});

/* ============================================================
   Churn scorer — [data-churn-demo]
   Four weighted signals -> 0–100 risk, written into the
   [data-progress-ring] that motion.ts owns, plus a plain-English
   verdict band and the factor contributing the most points.
   ============================================================ */
type Signal = Field & {
  weight: number;
  driver: string;
  /** 0 = healthy, 1 = worst case. */
  risk: (v: number) => number;
};

const CHURN_SIGNALS: Signal[] = [
  {
    key: 'logins',
    label: 'Product logins per week',
    min: 0, max: 20, step: 1, def: 9,
    weight: 0.3,
    driver: 'thin product usage',
    risk: (v) => clamp01((12 - v) / 12),
    fmt: (v) => `${int0.format(v)} per week`,
  },
  {
    key: 'recency',
    label: 'Days since the last report was opened',
    min: 0, max: 90, step: 1, def: 21,
    weight: 0.3,
    driver: 'the account has gone quiet',
    risk: (v) => clamp01(v / 60),
    fmt: (v) => `${int0.format(v)} ${v === 1 ? 'day' : 'days'} ago`,
  },
  {
    key: 'tickets',
    label: 'Support tickets in the last 30 days',
    min: 0, max: 12, step: 1, def: 2,
    weight: 0.2,
    driver: 'support pressure',
    risk: (v) => clamp01(v / 8),
    fmt: (v) => `${int0.format(v)} ${v === 1 ? 'ticket' : 'tickets'}`,
  },
  {
    key: 'nps',
    label: 'Last satisfaction score, 0 to 10',
    min: 0, max: 10, step: 1, def: 8,
    weight: 0.2,
    driver: 'a weak satisfaction score',
    risk: (v) => clamp01((9 - v) / 9),
    fmt: (v) => `${int0.format(v)} out of 10`,
  },
];

const CHURN_BANDS = [
  { max: 24, key: 'low', name: 'Low risk', line: 'This account looks healthy. Keep it on the standard quarterly review.' },
  { max: 49, key: 'watch', name: 'Watch', line: 'Nothing urgent, but the signals are drifting. Worth a check-in inside the month.' },
  { max: 74, key: 'risk', name: 'At risk', line: 'Renewal is genuinely in question. Get a human on a call this week, before the invoice lands.' },
  { max: 100, key: 'critical', name: 'Critical', line: 'Treat as a save case today: named owner, written plan, and something concrete to show by Friday.' },
];
const BAND_KEYS = CHURN_BANDS.map((b) => b.key);

each('[data-churn-demo]', (root) => {
  const map = bindFields(root, 'data-churn-in', CHURN_SIGNALS);
  if (!map.size) return;
  const ringHost = pick(root.getAttribute('data-churn-ring')) ?? $<HTMLElement>('[data-progress-ring]', root);
  const status = statusRegion(root, 'data-churn-status');
  let live = false;
  let repaint = 0;

  /* motion.ts builds the ring SVG and animates it in on enter; we only
     repaint it. Queried lazily so module import order cannot matter, and
     re-applied once after its 1.1s enter tween could have run. */
  const paintRing = (score: number) => {
    if (!ringHost) return;
    ringHost.setAttribute('data-progress', String(score));
    const bar = $<SVGCircleElement>('.mo-ring__bar', ringHost);
    const out = $<HTMLElement>('[data-ring-val], .mo-ring__val', ringHost);
    if (bar) {
      const circ = num(getComputedStyle(ringHost).getPropertyValue('--mo-ring-c'), 2 * Math.PI * 54);
      bar.style.strokeDasharray = circ.toFixed(2);
      bar.style.strokeDashoffset = (circ * (1 - score / 100)).toFixed(2);
    }
    if (out) out.textContent = String(score);
    else if (ringHost.hasAttribute('aria-label')) ringHost.setAttribute('aria-label', `Churn risk ${score} out of 100`);
  };

  const render = () => {
    const scored = CHURN_SIGNALS.map((s) => {
      const v = val(map, s.key, s.def);
      const r = s.risk(v);
      return { s, v, points: s.weight * r * 100 };
    });
    const score = Math.round(clamp(scored.reduce((t, x) => t + x.points, 0), 0, 100));
    const band = CHURN_BANDS.find((b) => score <= b.max) ?? CHURN_BANDS[CHURN_BANDS.length - 1];
    const top = scored.slice().sort((a, b) => b.points - a.points)[0];
    const factor =
      top.points < 4
        ? 'No single signal is pulling this account down.'
        : `Biggest driver: ${top.s.driver} — ${int0.format(Math.round(top.points))} of the ${int0.format(score)} points.`;

    paintRing(score);
    BAND_KEYS.forEach((k) => root.classList.toggle(`pg-churn--${k}`, k === band.key));
    root.setAttribute('data-churn-band', band.key);
    paintOuts(root, 'data-churn-out', {
      score: int0.format(score),
      scoreof: `${int0.format(score)}/100`,
      band: band.name,
      verdict: band.line,
      factor,
      action: band.line,
      weights: CHURN_SIGNALS.map((s) => `${s.driver} ${int0.format(s.weight * 100)}%`).join(' · '),
    });
    paintFieldReadouts(root, map, CHURN_SIGNALS, 'data-churn-val');
    if (live) status.textContent = `Risk score ${score} out of 100 — ${band.name}. ${band.line} ${factor}`;

    clearTimeout(repaint);
    repaint = window.setTimeout(() => paintRing(score), 1250);
  };

  root.addEventListener('input', (e) => {
    if ((e.target as HTMLElement)?.matches('input')) {
      live = true;
      render();
    }
  });
  render();
  requestAnimationFrame(() => render());
});

/* ============================================================
   Forecast demo — [data-forecast-demo]
   Own inline SVG (widgets.ts charts do not draw confidence bands):
   twelve months of actuals, then N months of forecast with a band
   that widens with the square root of the horizon.
   ============================================================ */
const FC_ACTUAL = [412, 438, 466, 451, 494, 528, 547, 561, 598, 634, 671, 712];
const FC_LABELS = MONTHS;
const FC_W = 720;
const FC_H = 300;
const FC_PAD = { t: 18, r: 16, b: 30, l: 46 };

const FC_FIELDS: Field[] = [
  { key: 'horizon', label: 'Forecast horizon in months', min: 3, max: 12, step: 1, def: 6, fmt: (v) => `${int0.format(v)} months ahead` },
];

const svgEl = <K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  return el;
};

each('[data-forecast-demo]', (root) => {
  const map = bindFields(root, 'data-forecast-in', FC_FIELDS);
  const stage = $<HTMLElement>('[data-forecast-plot]', root) ?? root.querySelector<HTMLElement>('.pg-fc__plot');
  if (!stage) return;
  const status = statusRegion(root, 'data-forecast-status');
  const table = $<HTMLElement>('[data-forecast-table]', root);
  let live = false;

  // Trend from the last six actuals, so the forecast follows the real slope.
  const tail = FC_ACTUAL.slice(-6);
  const slope = (tail[tail.length - 1] - tail[0]) / (tail.length - 1);
  const last = FC_ACTUAL[FC_ACTUAL.length - 1];

  const render = () => {
    const horizon = Math.round(val(map, 'horizon', 6));
    const fc: number[] = [];
    const lo: number[] = [];
    const hi: number[] = [];
    for (let i = 1; i <= horizon; i++) {
      const mid = last + slope * i * 0.92;
      const spread = mid * (0.035 + 0.028 * Math.sqrt(i));
      fc.push(mid);
      lo.push(mid - spread);
      hi.push(mid + spread);
    }

    const all = [...FC_ACTUAL, ...hi, ...lo];
    const maxV = Math.max(...all) * 1.04;
    const minV = Math.min(...all) * 0.9;
    const n = FC_ACTUAL.length + horizon;
    const x = (i: number) => FC_PAD.l + (i * (FC_W - FC_PAD.l - FC_PAD.r)) / (n - 1);
    const y = (v: number) => FC_PAD.t + (1 - (v - minV) / (maxV - minV)) * (FC_H - FC_PAD.t - FC_PAD.b);
    const line = (vals: number[], from: number) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(from + i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

    const svg = svgEl('svg', {
      class: 'pg-fc__svg',
      viewBox: `0 0 ${FC_W} ${FC_H}`,
      role: 'img',
      'aria-label': `Monthly revenue: twelve months of actuals to December, then a ${horizon}-month forecast with an eighty per cent confidence band.`,
    });

    // Gridlines + y axis labels.
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const v = minV + ((maxV - minV) * t) / ticks;
      svg.appendChild(svgEl('line', { class: 'pg-fc__grid', x1: FC_PAD.l, x2: FC_W - FC_PAD.r, y1: y(v).toFixed(1), y2: y(v).toFixed(1) }));
      const lbl = svgEl('text', { class: 'pg-fc__ytick', x: FC_PAD.l - 8, y: (y(v) + 4).toFixed(1), 'text-anchor': 'end' });
      lbl.textContent = `€${int0.format(Math.round(v))}k`;
      svg.appendChild(lbl);
    }

    // Confidence band, forecast line, actual line.
    const bandUp = [last, ...hi];
    const bandDown = [...lo].reverse();
    const startIdx = FC_ACTUAL.length - 1;
    const upD = bandUp.map((v, i) => `${i ? 'L' : 'M'}${x(startIdx + i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const downD = bandDown.map((v, i) => `L${x(n - 1 - i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    svg.appendChild(svgEl('path', { class: 'pg-fc__band', d: `${upD} ${downD} L${x(startIdx).toFixed(1)} ${y(last).toFixed(1)} Z` }));
    svg.appendChild(svgEl('path', { class: 'pg-fc__fc', d: line([last, ...fc], startIdx), fill: 'none' }));
    svg.appendChild(svgEl('path', { class: 'pg-fc__actual', d: line(FC_ACTUAL, 0), fill: 'none' }));
    svg.appendChild(svgEl('line', { class: 'pg-fc__split', x1: x(startIdx).toFixed(1), x2: x(startIdx).toFixed(1), y1: FC_PAD.t, y2: FC_H - FC_PAD.b }));

    // Last actual + horizon end markers.
    svg.appendChild(svgEl('circle', { class: 'pg-fc__dot', cx: x(startIdx).toFixed(1), cy: y(last).toFixed(1), r: 4 }));
    svg.appendChild(svgEl('circle', { class: 'pg-fc__dot pg-fc__dot--fc', cx: x(n - 1).toFixed(1), cy: y(fc[fc.length - 1]).toFixed(1), r: 4 }));

    // X labels: every actual quarter, then the horizon end.
    FC_LABELS.forEach((m, i) => {
      if (i % 3) return;
      const t = svgEl('text', { class: 'pg-fc__xtick', x: x(i).toFixed(1), y: FC_H - 10, 'text-anchor': 'middle' });
      t.textContent = m;
      svg.appendChild(t);
    });
    const endLbl = svgEl('text', { class: 'pg-fc__xtick pg-fc__xtick--end', x: x(n - 1).toFixed(1), y: FC_H - 10, 'text-anchor': 'end' });
    endLbl.textContent = `+${horizon}m`;
    svg.appendChild(endLbl);

    stage.textContent = '';
    stage.appendChild(svg);
    if (!prefersReduced()) stage.classList.add('pg-fc__plot--drawn');

    const end = fc[fc.length - 1];
    const growth = ((end - last) / last) * 100;
    paintOuts(root, 'data-forecast-out', {
      horizon: `${int0.format(horizon)} months`,
      point: `€${int0.format(Math.round(end))}k`,
      range: `€${int0.format(Math.round(lo[lo.length - 1]))}k – €${int0.format(Math.round(hi[hi.length - 1]))}k`,
      growth: `${growth >= 0 ? '+' : '−'}${dec1.format(Math.abs(growth))}%`,
      band: `±${dec1.format(((hi[hi.length - 1] - end) / end) * 100)}%`,
      method: 'Damped linear trend on the last six months, 80% interval widening with √horizon.',
    });
    paintFieldReadouts(root, map, FC_FIELDS, 'data-forecast-val');

    if (table) {
      table.textContent = '';
      const rows = fc
        .map((v, i) => `${FC_LABELS[(FC_ACTUAL.length + i) % 12]} +${i + 1}: €${int0.format(Math.round(v))}k (€${int0.format(Math.round(lo[i]))}k–€${int0.format(Math.round(hi[i]))}k)`)
        .join('; ');
      table.textContent = `Forecast, ${horizon} months: ${rows}.`;
    }
    if (live) {
      status.textContent = `${horizon}-month horizon. Central forecast €${int0.format(Math.round(end))}k, range €${int0.format(
        Math.round(lo[lo.length - 1])
      )}k to €${int0.format(Math.round(hi[hi.length - 1]))}k.`;
    }
  };

  root.addEventListener('input', (e) => {
    if ((e.target as HTMLElement)?.matches('input')) {
      live = true;
      render();
    }
  });
  render();
});

/* ============================================================
   Pipeline demo — [data-pipeline-demo]
   Run walks the stages in sequence with a growing log feed; Reset
   clears it. setTimeout chain, cancellable, and under reduced motion
   the whole run resolves in one tick.
   ============================================================ */
type Stage = { key: string; name: string; ms: number; lines: string[] };

const PIPE_STAGES: Stage[] = [
  {
    key: 'extract',
    name: 'Extract',
    ms: 620,
    lines: [
      'Connected to the warehouse read replica (eu-west-1).',
      'orders — 12,438 rows read since the last watermark.',
      'campaigns, inventory_health — 492 rows read.',
    ],
  },
  {
    key: 'validate',
    name: 'Validate',
    ms: 560,
    lines: [
      'Schema contract holds on all four tables.',
      '17 rows quarantined — null order_date, written to _rejects with the raw payload.',
      '12,421 rows carry on to transform.',
    ],
  },
  {
    key: 'transform',
    name: 'Transform',
    ms: 700,
    lines: [
      'Amounts normalised to EUR at the daily ECB rate.',
      'Channel labels mapped onto the five canonical values.',
      'Daily grain rebuilt — 366 rows, one per date.',
    ],
  },
  {
    key: 'load',
    name: 'Load',
    ms: 480,
    lines: [
      'Upsert into mart.orders_daily on (order_date, channel).',
      '366 rows upserted, 0 duplicates — the run is safe to repeat.',
    ],
  },
  {
    key: 'publish',
    name: 'Publish',
    ms: 420,
    lines: [
      'Dashboard extract refreshed; cache warmed for the two exec pages.',
      'Run logged — 12,438 in · 12,421 out · 17 quarantined.',
      'Green notice posted to #data-ops.',
    ],
  },
];

const PIPE_TOTALS = {
  rows: '12,438',
  loaded: '12,421',
  rejected: '17',
  tables: '4',
};

each('[data-pipeline-demo]', (root) => {
  const stages = ($$('[data-pipeline-stage]', root).length
    ? $$('[data-pipeline-stage]', root)
    : $$('.pg-pipe__stage', root)) as HTMLElement[];
  const runBtn = $<HTMLButtonElement>('[data-pipeline-run]', root);
  const resetBtn = $<HTMLButtonElement>('[data-pipeline-reset]', root);
  const logHost = $<HTMLElement>('[data-pipeline-log]', root);
  if (!stages.length || !runBtn) return;

  const status = statusRegion(root, 'data-pipeline-status');
  let list: HTMLOListElement | null = null;
  if (logHost) {
    logHost.setAttribute('role', 'log');
    logHost.setAttribute('aria-live', 'polite');
    logHost.setAttribute('aria-relevant', 'additions');
    list = logHost instanceof HTMLOListElement ? logHost : logHost.querySelector('ol');
    if (!list) {
      list = document.createElement('ol');
      list.className = 'pg-pipe__loglist';
      logHost.appendChild(list);
    }
  }

  const spec = (el: HTMLElement, i: number): Stage => {
    const key = (el.getAttribute('data-pipeline-stage') || '').trim().toLowerCase();
    return (
      PIPE_STAGES.find((s) => s.key === key) ??
      PIPE_STAGES[i] ?? {
        key: key || `stage-${i + 1}`,
        name: (el.getAttribute('data-pipeline-name') || el.textContent || `Stage ${i + 1}`).trim(),
        ms: 500,
        lines: ['Stage complete.'],
      }
    );
  };

  let timers: number[] = [];
  let running = false;
  let clock = 0;

  const stamp = (ms: number) => {
    const s = ms / 1000;
    return `${s.toFixed(1)}s`;
  };

  const log = (stageName: string, text: string, tone = '') => {
    if (!list) return;
    const li = document.createElement('li');
    li.className = tone ? `pg-pipe__logline pg-pipe__logline--${tone}` : 'pg-pipe__logline';
    const t = document.createElement('span');
    t.className = 'pg-pipe__logtime';
    t.textContent = stamp(clock);
    const s = document.createElement('span');
    s.className = 'pg-pipe__logstage';
    s.textContent = stageName;
    const m = document.createElement('span');
    m.className = 'pg-pipe__logmsg';
    m.textContent = text;
    li.append(t, s, m);
    list.appendChild(li);
    logHost!.scrollTop = logHost!.scrollHeight;
  };

  const setState = (s: 'idle' | 'running' | 'done') => {
    root.setAttribute('data-pipeline-state', s);
    root.classList.toggle('pg-pipe--running', s === 'running');
    root.classList.toggle('pg-pipe--done', s === 'done');
    runBtn.disabled = s === 'running';
    runBtn.setAttribute('aria-disabled', s === 'running' ? 'true' : 'false');
    if (logHost) logHost.setAttribute('aria-busy', s === 'running' ? 'true' : 'false');
  };

  const clearRun = (quiet = false) => {
    timers.forEach(clearTimeout);
    timers = [];
    running = false;
    clock = 0;
    stages.forEach((el) => {
      el.classList.remove('pg-pipe__stage--running', 'pg-pipe__stage--done');
      el.removeAttribute('data-pipeline-done');
    });
    if (list) list.textContent = '';
    paintOuts(root, 'data-pipeline-out', { rows: EM_DASH, loaded: EM_DASH, rejected: EM_DASH, duration: EM_DASH, tables: EM_DASH, stage: 'Idle' });
    setState('idle');
    if (!quiet) status.textContent = 'Pipeline reset. Nothing has run yet.';
  };

  const finish = () => {
    running = false;
    setState('done');
    paintOuts(root, 'data-pipeline-out', {
      rows: PIPE_TOTALS.rows,
      loaded: PIPE_TOTALS.loaded,
      rejected: PIPE_TOTALS.rejected,
      tables: PIPE_TOTALS.tables,
      duration: stamp(clock),
      stage: 'Complete',
    });
    log('done', `Run finished in ${stamp(clock)} — ${PIPE_TOTALS.loaded} rows loaded, ${PIPE_TOTALS.rejected} quarantined, 0 failures.`, 'ok');
    status.textContent = `Run complete in ${stamp(clock)}. ${PIPE_TOTALS.loaded} rows loaded, ${PIPE_TOTALS.rejected} rows quarantined, no failures.`;
  };

  const run = () => {
    if (running) return;
    clearRun(true);
    running = true;
    setState('running');
    status.textContent = `Pipeline running — ${stages.length} stages.`;

    if (prefersReduced()) {
      stages.forEach((el, i) => {
        const st = spec(el, i);
        clock += st.ms;
        el.classList.add('pg-pipe__stage--done');
        el.setAttribute('data-pipeline-done', 'true');
        st.lines.forEach((l) => log(st.name, l));
      });
      finish();
      return;
    }

    let delay = 0;
    stages.forEach((el, i) => {
      const st = spec(el, i);
      timers.push(
        window.setTimeout(() => {
          el.classList.add('pg-pipe__stage--running');
          paintOuts(root, 'data-pipeline-out', { stage: st.name });
          st.lines.forEach((l, k) => {
            timers.push(
              window.setTimeout(() => {
                clock += st.ms / (st.lines.length + 1);
                log(st.name, l);
              }, ((k + 1) * st.ms) / (st.lines.length + 1))
            );
          });
          timers.push(
            window.setTimeout(() => {
              el.classList.remove('pg-pipe__stage--running');
              el.classList.add('pg-pipe__stage--done');
              el.setAttribute('data-pipeline-done', 'true');
            }, st.ms)
          );
        }, delay)
      );
      delay += st.ms + 120;
    });
    timers.push(window.setTimeout(finish, delay + 60));
  };

  runBtn.addEventListener('click', run);
  resetBtn?.addEventListener('click', () => {
    clearRun();
    resetBtn.blur();
    runBtn.focus();
  });
  clearRun(true);
});
