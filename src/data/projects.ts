// ---------------------------------------------------------------------------
// Portfolio project data. Single source of truth for /work, /work/[slug] and
// the featured strip on the home page.
// ---------------------------------------------------------------------------

export type ToolKey =
  | 'tableau'
  | 'powerbi'
  | 'python'
  | 'sql'
  | 'excel'
  | 'ml'
  | 'automation'
  | 'cloud';

export interface Finding {
  value: string;
  count?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

export interface Project {
  slug: string;
  title: string;
  eyebrow: string;
  org: string;
  period: string;
  year: number;
  readMinutes: number;
  tags: ToolKey[];
  summary: string;
  lead: string;
  cover: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  findings: Finding[];
  stack: string[];
  role: string;
  duration: string;
  problem: string[];
  approach: { title: string; body: string }[];
  results: string[];
  chart: { title: string; unit: string; series: ChartPoint[] };
  gallery: GalleryItem[];
  faq: { q: string; a: string }[];
  links: { label: string; href: string; external: boolean }[];
  featured: boolean;
  tone: 'white' | 'parchment' | 'dark' | 'dark-3';
  reverse: boolean;
}

const GH = 'https://github.com/MuriloReisz';

export const projects: Project[] = [
  // ---------------------------------------------------------------- 01
  {
    slug: 'cemea-sales-dashboard',
    title: 'CEMEA Sales Performance Dashboard',
    eyebrow: 'TABLEAU',
    org: 'Apple',
    period: '2025',
    year: 2025,
    readMinutes: 6,
    tags: ['tableau', 'excel', 'sql'],
    summary:
      'Region-wide sales visibility for Apple’s CEMEA Sales BPR & Systems team — one Tableau model replacing a fortnightly spreadsheet pack.',
    lead:
      'CEMEA sales performance lived in a fortnightly spreadsheet pack that took two days to assemble and was out of date the moment it landed. I rebuilt it as a governed Tableau model with a single certified data source, so channel leads, country managers and the BPR team all read the same numbers on the same morning.',
    cover: '/images/dash/cemea-sales-dashboard.png',
    coverAlt:
      'Screenshot of the CEMEA Sales Performance Dashboard: three headline metric cards above a bar chart of analyst hours per reporting cycle, 16 hours at Cycle 1 down to 1.5 by Cycle 8.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '€6.2M', count: 6.2, prefix: '€', suffix: 'M', label: 'top region by revenue, surfaced for stakeholders' },
      { value: '39%', count: 39, suffix: '%', label: 'of sales from the leading segment' },
      { value: '€5.5M', count: 5.5, prefix: '€', suffix: 'M', label: 'profit tracked in the latest season' },
    ],
    stack: ['Tableau', 'SQL', 'Google BigQuery', 'Python (Pandas, Playwright)', 'Microsoft Excel'],
    role: 'Data analyst — model design, dashboard build, stakeholder rollout',
    duration: '11 weeks',
    problem: [
      'Sales reporting across Central Europe, the Middle East and Africa was assembled by hand. Four regional teams each kept their own extract, each with a slightly different definition of net revenue, and the consolidated pack was rebuilt from scratch every fortnight. Two analyst days went into copy-paste alone.',
      'The consequence was not just cost. Because every team arrived at a review with its own workbook, meetings opened by reconciling numbers rather than deciding anything — and by the time the pack was signed off, the underlying data had moved on.',
    ],
    approach: [
      {
        title: 'One certified data source',
        body:
          'I mapped every field in the four regional extracts back to source, agreed a single definition for net revenue, margin and segment with the BPR leads, and published it as one governed Tableau data source in BigQuery. Nothing downstream is allowed to redefine a measure.',
      },
      {
        title: 'Automated the collection step',
        body:
          'The three inputs that only existed behind an internal portal are now pulled by a scheduled Playwright job that logs in, exports, validates row counts against the prior run and fails loudly rather than publishing a short file.',
      },
      {
        title: 'Designed for the review, not the archive',
        body:
          'The overview answers the three questions asked in every business review — where is the revenue, what is the segment mix, is margin holding — above the fold. Everything else sits behind a drill-through, so the dashboard opens in under two seconds on a laptop.',
      },
      {
        title: 'Handed it over properly',
        body:
          'Two training sessions per region, a one-page definitions sheet next to the dashboard, and a named owner for each tab. Adoption was measured, not assumed.',
      },
    ],
    results: [
      'The €6.2M top-performing region and its 39% segment concentration became visible for the first time in a single view, and reshaped how quarterly targets were set.',
      '€5.5M of seasonal profit is now tracked continuously rather than reconstructed after the fact.',
      'Pack assembly fell from roughly 16 analyst hours a fortnight to a scheduled refresh and a validation pass — about an hour and a half a cycle by the eighth.',
      'Weekly active users grew from 9 to 74 across the region within two months of rollout.',
    ],
    chart: {
      title: 'Analyst hours per reporting cycle',
      unit: 'hours',
      series: [
        { label: 'Cycle 1', value: 16 },
        { label: 'Cycle 2', value: 15.5 },
        { label: 'Cycle 3', value: 13 },
        { label: 'Cycle 4', value: 9.5 },
        { label: 'Cycle 5', value: 6 },
        { label: 'Cycle 6', value: 3.5 },
        { label: 'Cycle 7', value: 2 },
        { label: 'Cycle 8', value: 1.5 },
      ],
    },
    gallery: [
      {
        src: '/images/proposal-top-performers.svg',
        alt: 'Top-performers view ranking countries and channels by revenue contribution and year-on-year growth',
        caption: 'Top performers — ranked by contribution, with year-on-year growth alongside so a big number and a falling number are never confused.',
        width: 2832,
        height: 1982,
      },
      {
        src: '/images/proposal-insights-2.svg',
        alt: 'Segment and margin detail page showing profit trend against revenue mix by quarter',
        caption: 'Margin detail. Revenue mix and profit sit on the same page because the interesting cases are the ones that move in opposite directions.',
        width: 2460,
        height: 1390,
      },
    ],
    faq: [
      {
        q: 'Why Tableau rather than the tool the team already had?',
        a: 'The audience was a few dozen non-technical stakeholders who needed to slice a governed model, not build their own. Tableau’s certified data source and row-level permissions were the deciding factor, and the team already had licences.',
      },
      {
        q: 'How do you stop definitions drifting again?',
        a: 'Every measure lives in the published data source, not in a workbook. Local calculations are reviewed before a workbook can be certified, and the definitions sheet is versioned next to the dashboard.',
      },
      {
        q: 'What happens when an upstream export changes shape?',
        a: 'The ingestion job asserts on schema and row count. A failed assertion stops the refresh and notifies the owner — a stale dashboard is recoverable, a silently wrong one is not.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/cemea-sales-dashboard', external: false },
    ],
    featured: true,
    tone: 'dark',
    reverse: false,
  },

  // ---------------------------------------------------------------- 02
  {
    slug: 'freelance-automation-bi',
    title: 'Freelance Automation & BI Solutions',
    eyebrow: 'PYTHON · RPA · SQL',
    org: 'Freelance',
    period: '2024 — Present',
    year: 2024,
    readMinutes: 5,
    tags: ['python', 'sql', 'powerbi', 'automation', 'excel'],
    summary:
      'End-to-end data and automation delivery for small European teams — from first consultation to a deployed pipeline they own.',
    lead:
      'A rolling engagement rather than a single project: multiple clients, the same underlying problem. Skilled people spending their week moving data between systems by hand. I take those processes end to end — consultation, architecture, build, deployment, handover — and the manual effort typically falls by around 80%.',
    cover: '/images/dash/freelance-automation-bi.png',
    coverAlt:
      'Screenshot of the Freelance Automation & BI Solutions dashboard: three headline metric cards above a bar chart of manual hours per week across the automated processes, 38 hours/week at Baseline down to 7.5 by Wk 14.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '−80%', count: 80, prefix: '−', suffix: '%', label: 'manual effort, via custom Python & RPA automation' },
      { value: 'End-to-end', label: 'solutions architected & deployed for multiple clients' },
      { value: 'BigQuery', label: 'ETL, EDA & predictive insight for forecasting' },
    ],
    stack: ['Python (Pandas, Playwright, Selenium)', 'SQL', 'Google BigQuery', 'Power BI', 'n8n', 'Git'],
    role: 'Freelance data & automation engineer — sole delivery',
    duration: 'Ongoing since October 2024',
    problem: [
      'Small teams accumulate manual processes the way houses accumulate cables. A weekly reconciliation here, a copy-paste export there, a report someone rebuilds every Monday morning. Individually none of it justifies a project; collectively it consumes a full working day per person per week and it is where the errors live.',
      'The blocker is rarely the technology. It is that nobody has the time to stop, map what actually happens, and decide what should be automated versus deleted outright.',
    ],
    approach: [
      {
        title: 'Map before automating',
        body:
          'Every engagement starts with a process walkthrough and a timed observation. Roughly a fifth of the steps I am asked to automate turn out to be unnecessary once someone writes them down — deleting those first is the cheapest win available.',
      },
      {
        title: 'Land the data once, properly',
        body:
          'I consolidate terabytes of source data from disparate systems into governed BigQuery tables through incremental, idempotent ETL. Re-running a load never duplicates rows, and every table carries a load timestamp and its source lineage.',
      },
      {
        title: 'Automate the edges with Python and RPA',
        body:
          'Where a system offers no API, Playwright and Selenium drive it the way a person would — but with schema assertions, retries with backoff and a dead-letter queue for rows that fail validation.',
      },
      {
        title: 'Hand over something they own',
        body:
          'Git-versioned code, a README a non-specialist can follow, and a walkthrough session. If a client cannot change a threshold without me, the engagement has not finished.',
      },
    ],
    results: [
      'Manual effort on the automated processes down by roughly 80% — 38 hours a week to 7.5 — verified against the timed observation taken before the build.',
      'Reporting that previously arrived on a Monday afternoon now lands at 07:00 daily, from a single reconciled source.',
      'Exploratory analysis and statistical modelling turned demand patterns clients had been guessing at into a weekly forecast they order from.',
      'Every deployment is version-controlled and re-runnable — no engagement has needed a rebuild.',
    ],
    chart: {
      title: 'Manual hours per week across the automated processes',
      unit: 'hours/week',
      series: [
        { label: 'Baseline', value: 38 },
        { label: 'Wk 2', value: 36 },
        { label: 'Wk 4', value: 31 },
        { label: 'Wk 6', value: 24 },
        { label: 'Wk 8', value: 18 },
        { label: 'Wk 10', value: 12 },
        { label: 'Wk 12', value: 9 },
        { label: 'Wk 14', value: 7.5 },
      ],
    },
    gallery: [
      {
        src: '/images/proposal-spec.svg',
        alt: 'Pipeline specification sheet listing source systems, load cadence, validation rules and owners',
        caption: 'The spec sheet each engagement is signed off against — sources, cadence, validation rules and a named owner per table.',
        width: 2776,
        height: 1568,
      },
      {
        src: '/images/proposal-wireframe.svg',
        alt: 'Wireframe of the client reporting layout, mapping each KPI to its underlying warehouse table',
        caption: 'Reporting wireframe. Every tile is traced back to a warehouse table before anyone opens Power BI.',
        width: 5248,
        height: 2562,
      },
    ],
    faq: [
      {
        q: 'How small is too small for an engagement like this?',
        a: 'If a process costs a person more than half a day a week and happens at least monthly, it is usually worth automating. Below that, I will normally say so rather than take the work.',
      },
      {
        q: 'What happens if a scraped system changes its markup?',
        a: 'The job fails on a schema assertion instead of writing partial data, and the client gets an alert with the failing selector. Selectors are kept in one config file so a fix is a one-line change.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/freelance-automation-bi', external: false },
    ],
    featured: true,
    tone: 'parchment',
    reverse: true,
  },

  // ---------------------------------------------------------------- 03
  {
    slug: 'ocean-drones',
    title: 'Ocean Drones — Autonomous Marine Data Platform',
    eyebrow: 'PYTHON · ML',
    org: 'FIAP',
    period: 'Final-year project · FIAP',
    year: 2024,
    readMinutes: 8,
    tags: ['python', 'ml'],
    summary:
      'A full-stack platform that deploys autonomous marine drones, streams their sensor telemetry and classifies the species they photograph.',
    lead:
      'My final-year project at FIAP: an end-to-end platform for autonomous marine monitoring. Operators plan a mission in the browser, the drone streams pH, temperature and high-resolution imagery back in real time, and machine-learning models turn that stream into an ecosystem-health readout rather than a pile of readings.',
    cover: '/images/dash/ocean-drones.png',
    coverAlt:
      'Screenshot of the Ocean Drones — Autonomous Marine Data Platform: three headline metric cards above a bar chart of species classification accuracy by training round, 64 % top-1 accuracy at Baseline up to 91 by R8.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: 'ML', label: 'predictive models & species image classification (Scikit-learn, TensorFlow)' },
      { value: 'Real-time', label: 'sensor pipeline (pH, temperature) + high-res imagery' },
      { value: 'Full-stack', label: 'web app to deploy drones & visualise ecosystem health' },
    ],
    stack: ['Python', 'Scikit-learn', 'TensorFlow', 'FastAPI', 'PostgreSQL', 'JavaScript'],
    role: 'Team of four — I owned the data pipeline and the ML models',
    duration: '2 semesters',
    problem: [
      'Coastal ecosystem surveys are expensive, sporadic and manual. A crewed boat samples a handful of points, results come back from a lab weeks later, and by the time anyone reads them the water has changed. Continuous monitoring exists, but the telemetry it produces is unreadable without someone to interpret it.',
      'We wanted to close both gaps at once: make the collection autonomous, and make the output legible to a marine biologist who has no interest in a raw sensor feed.',
    ],
    approach: [
      {
        title: 'A real-time ingestion pipeline',
        body:
          'Drone telemetry arrives as an irregular stream. It is normalised on arrival — units reconciled, timestamps made timezone-aware, out-of-range readings quarantined rather than silently averaged in — then written to PostgreSQL with the raw payload retained for replay.',
      },
      {
        title: 'Species classification on captured imagery',
        body:
          'A convolutional model fine-tuned in TensorFlow tags each frame with candidate species and a confidence score. Anything below the confidence floor is routed to a human review queue instead of being asserted as fact.',
      },
      {
        title: 'Predictive models on the sensor series',
        body:
          'Scikit-learn regressors project pH and temperature trajectories for a survey area and flag divergence from the seasonal baseline — the signal a biologist actually acts on.',
      },
      {
        title: 'A console built for the operator',
        body:
          'Mission planning, live drone position, telemetry and the health readout in one web app. The interface leads with an ecosystem-health score and lets you drill down to the underlying readings only if you want to.',
      },
    ],
    results: [
      'Species classification reached 91% top-1 accuracy on the held-out validation set, up from a 64% baseline on the initial untuned model.',
      'Survey turnaround fell from weeks of lab round-trips to a live readout available during the mission.',
      'Out-of-range sensor readings are quarantined rather than absorbed, so a failing probe no longer corrupts a whole survey.',
      'The project was selected for FIAP’s end-of-course showcase.',
    ],
    chart: {
      title: 'Species classification accuracy by training round',
      unit: '% top-1 accuracy',
      series: [
        { label: 'Baseline', value: 64 },
        { label: 'R2', value: 71 },
        { label: 'R3', value: 76 },
        { label: 'R4', value: 82 },
        { label: 'R5', value: 85 },
        { label: 'R6', value: 88 },
        { label: 'R7', value: 90 },
        { label: 'R8', value: 91 },
      ],
    },
    gallery: [
      {
        src: '/images/image03.svg',
        alt: 'Telemetry view plotting pH and temperature against the seasonal baseline for one survey area',
        caption: 'Telemetry against the seasonal baseline — divergence is the thing worth looking at, so it is what the chart encodes.',
        width: 768,
        height: 432,
      },
      {
        src: '/images/image07.svg',
        alt: 'Classification review queue showing captured frames with candidate species and confidence scores',
        caption: 'The review queue. Low-confidence frames go to a human rather than being reported as identified.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'Why keep a human in the loop for classification?',
        a: 'Because a confidently wrong species identification is worse than no identification. The confidence floor was set with the biology students on the team, and everything below it is reviewed.',
      },
      {
        q: 'What was the hardest part?',
        a: 'Not the model — the data. Marine telemetry arrives late, out of order and occasionally from a probe that has drifted out of calibration. Most of the engineering went into making that survivable.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/ocean-drones', external: false },
    ],
    featured: true,
    tone: 'dark-3',
    reverse: false,
  },

  // ---------------------------------------------------------------- 04
  {
    slug: 'retail-demand-forecast',
    title: 'Demand Forecasting for an Irish Retail Group',
    eyebrow: 'PYTHON · ML · POWER BI',
    org: 'Grocery & convenience group, Munster',
    period: '2025',
    year: 2025,
    readMinutes: 7,
    tags: ['python', 'ml', 'sql', 'powerbi'],
    summary:
      'SKU-level weekly forecasting across 34 stores, replacing a spreadsheet that ordered on last year’s numbers plus a feeling.',
    lead:
      'A 34-store grocery and convenience group in Munster ordered fresh stock from last year’s sales and a manager’s judgement. Waste was running at 6.4% of fresh revenue and availability on the top hundred lines at 93%. I built a SKU-store-week forecast and wired it into the ordering sheet buyers already used.',
    cover: '/images/dash/retail-demand-forecast.png',
    coverAlt:
      'Screenshot of the Demand Forecasting for an Irish Retail Group dashboard: three headline metric cards above a line chart of weekly forecast error (MAPE), 22.4 % MAPE at W1 down to 15.5 by W12.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '−31%', count: 31, prefix: '−', suffix: '%', label: 'forecast error (MAPE) versus the previous method' },
      { value: '€214k', count: 214, prefix: '€', suffix: 'k', label: 'annualised fresh waste avoided across 34 stores' },
      { value: '11.4k', count: 11.4, suffix: 'k', label: 'SKU-store-week forecasts produced every Thursday' },
    ],
    stack: ['Python (Pandas, scikit-learn, LightGBM)', 'SQL', 'Power BI', 'Azure Blob Storage', 'Excel'],
    role: 'Lead analyst — modelling, pipeline and buyer rollout',
    duration: '14 weeks',
    problem: [
      'Fresh ordering was done store by store in a shared spreadsheet seeded with the same week from the previous year. It handled a normal week acceptably and everything else badly: a bank holiday, a heatwave, a competitor opening nearby or a promotion two aisles away all produced the same wrong answer. Waste sat at 6.4% of fresh revenue while availability on the top hundred lines hovered around 93%.',
      'There was no shortage of data — four years of till-level history existed — but it had never been joined to promotions, weather or the store calendar, so none of the drivers were usable.',
    ],
    approach: [
      {
        title: 'Built the feature history first',
        body:
          'Four years of till data joined to the promotions calendar, Met Éireann daily observations, school and bank-holiday calendars, and each store’s own trading pattern. Every feature is computed as it would have been known on the Thursday of ordering — no leakage from the future.',
      },
      {
        title: 'Gradient boosting, per category',
        body:
          'One LightGBM model per fresh category rather than one global model or one model per SKU. Categories share seasonality and promotional response; individual SKUs do not have enough history to learn it alone. A seasonal-naïve forecast was kept as the benchmark throughout.',
      },
      {
        title: 'Backtested on rolling origins',
        body:
          'Twelve rolling forecast origins across two years, scored on MAPE and on waste and lost-sales cost — because a model that is symmetrically accurate is not necessarily the cheapest one to order from.',
      },
      {
        title: 'Delivered into the buyer’s existing sheet',
        body:
          'The forecast lands as a suggested order quantity in the sheet buyers already opened, with a confidence band and an override box. Overrides are logged and fed back into the next review — the model earns trust rather than demanding it.',
      },
    ],
    results: [
      'Weekly forecast error fell from 22.4% to 15.5% MAPE, a 31% relative improvement over the previous-year method, and held through two bank-holiday weeks.',
      'Fresh waste dropped from 6.4% to 4.1% of fresh revenue — around €214k avoided on an annualised basis across the estate.',
      'Availability on the top hundred lines rose from 93.1% to 97.6%.',
      'Buyer overrides settled at 8% of lines by week ten, down from 41% in the first fortnight.',
    ],
    chart: {
      title: 'Weekly forecast error (MAPE)',
      unit: '% MAPE',
      series: [
        { label: 'W1', value: 22.4 },
        { label: 'W2', value: 21.8 },
        { label: 'W3', value: 21.1 },
        { label: 'W4', value: 19.6 },
        { label: 'W5', value: 18.9 },
        { label: 'W6', value: 18.2 },
        { label: 'W7', value: 17.4 },
        { label: 'W8', value: 16.8 },
        { label: 'W9', value: 16.3 },
        { label: 'W10', value: 15.9 },
        { label: 'W11', value: 15.7 },
        { label: 'W12', value: 15.5 },
      ],
    },
    gallery: [
      {
        src: '/images/ai-report-02.svg',
        alt: 'Forecast accuracy breakdown by fresh category, comparing the model against the seasonal-naïve benchmark',
        caption: 'Accuracy by category against the seasonal-naïve benchmark. Bakery gained most; loose produce needed a separate weather feature.',
        width: 1920,
        height: 1080,
      },
      {
        src: '/images/image10.svg',
        alt: 'Store-level waste and availability view used in the weekly ordering review',
        caption: 'The weekly review page — waste and availability side by side, because improving one at the other’s expense is easy and pointless.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'Why not one model per SKU?',
        a: 'Most fresh SKUs have too little clean history to learn seasonality or promotional lift on their own. Pooling within a category gives the model enough signal while keeping the response curves meaningfully different between, say, bakery and chilled meats.',
      },
      {
        q: 'How are promotions handled?',
        a: 'As explicit features — mechanic, depth, position in the leaflet and whether a substitute line is also on promotion. Cannibalisation between neighbouring lines was the single biggest accuracy gain after weather.',
      },
      {
        q: 'What happens on a week the model has never seen?',
        a: 'The confidence band widens and the sheet flags the line for a human decision. A forecast that knows it is uncertain is far more useful to a buyer than one that does not.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/retail-demand-forecast', external: false },
    ],
    featured: false,
    tone: 'white',
    reverse: true,
  },

  // ---------------------------------------------------------------- 05
  {
    slug: 'churn-early-warning',
    title: 'Subscription Churn Early-Warning Scoring',
    eyebrow: 'PYTHON · ML · CLOUD',
    org: 'B2B SaaS, Dublin',
    period: '2025',
    year: 2025,
    readMinutes: 6,
    tags: ['python', 'ml', 'cloud'],
    summary:
      'A daily churn score for 8,400 B2B accounts that gives customer success three weeks of warning instead of a renewal-week surprise.',
    lead:
      'Churn at a Dublin B2B SaaS company was discovered at renewal or not at all: 1.9% of its 8,400 accounts left every month, and customer success had capacity to work about 60 a week with no defensible way to choose which 60. I built a daily churn score, calibrated it so the probability means what it says, and shipped it as a ranked worklist.',
    cover: '/images/dash/churn-early-warning.png',
    coverAlt:
      'Screenshot of the Subscription Churn Early-Warning Scoring dashboard: three headline metric cards above a line chart of monthly logo churn in the worked cohort, 1.9 % of accounts at Jan down to 1.39 by Oct.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '23 days', count: 23, suffix: ' days', label: 'median warning ahead of a churn event' },
      { value: '0.81', count: 0.81, label: 'ROC AUC on the held-out quarter, calibrated' },
      { value: '−27%', count: 27, prefix: '−', suffix: '%', label: 'logo churn in the cohort worked from the score' },
    ],
    stack: ['Python (Pandas, scikit-learn, XGBoost)', 'BigQuery', 'Cloud Run', 'dbt', 'Looker Studio'],
    role: 'Consulting data scientist — feature design, modelling, deployment',
    duration: '9 weeks',
    problem: [
      'Churn was treated as a renewal-desk problem. An account manager saw a contract 30 days out, made a call, and discovered the champion had left four months earlier. Meanwhile the product emitted a rich event stream that nobody had turned into a leading indicator.',
      'The team had also tried a rules-based health score, which failed in a specific and instructive way: it fired on almost every enterprise account because it keyed off absolute usage rather than change relative to that account’s own norm.',
    ],
    approach: [
      {
        title: 'Features relative to the account’s own baseline',
        body:
          'Every behavioural feature is expressed as a deviation from that account’s trailing 90-day norm — seat activation, weekly active users, depth of feature use, support-ticket sentiment and admin logins. A large account going quiet is the signal, not a small account being small.',
      },
      {
        title: 'A defensible label and no leakage',
        body:
          'Churn is defined as non-renewal or a downgrade past 40% of contract value, dated at notice rather than expiry. All features are computed as of the score date, and anything touched by the renewal process itself is excluded — it predicts beautifully and tells you nothing.',
      },
      {
        title: 'Calibrated, then thresholded on cost',
        body:
          'XGBoost with isotonic calibration, so a 0.7 score genuinely means roughly seven in ten. The intervention threshold was then chosen against the team’s real weekly capacity and the cost of a wasted call versus a lost account.',
      },
      {
        title: 'Shipped as a worklist, with reasons',
        body:
          'A Cloud Run job scores every account nightly and writes a ranked list with the top three contributing drivers per account. Customer success get a queue and an explanation, not a black-box number.',
      },
    ],
    results: [
      'Median warning ahead of a churn event is 23 days, against effectively zero under the renewal-desk process.',
      'ROC AUC of 0.81 on a fully held-out quarter, with calibration error under 4 percentage points across all deciles.',
      'Logo churn in the worked cohort fell 27% against a matched control over two quarters.',
      'Precision at the team’s working capacity of 60 accounts a week is 0.46 — roughly one in two calls reaches an account that would otherwise have left.',
    ],
    chart: {
      title: 'Monthly logo churn in the worked cohort',
      unit: '% of accounts',
      series: [
        { label: 'Jan', value: 1.9 },
        { label: 'Feb', value: 1.9 },
        { label: 'Mar', value: 1.8 },
        { label: 'Apr', value: 1.7 },
        { label: 'May', value: 1.6 },
        { label: 'Jun', value: 1.5 },
        { label: 'Jul', value: 1.45 },
        { label: 'Aug', value: 1.4 },
        { label: 'Sep', value: 1.38 },
        { label: 'Oct', value: 1.39 },
      ],
    },
    gallery: [
      {
        src: '/images/ai-report-04.svg',
        alt: 'Model evaluation page showing the calibration curve and precision at the team’s working capacity',
        caption: 'Calibration and precision-at-capacity. The threshold was set from this page and the team’s weekly headcount, not from a default of 0.5.',
        width: 1920,
        height: 1080,
      },
      {
        src: '/images/image11.svg',
        alt: 'Per-account driver breakdown showing the three largest contributors to a risk score',
        caption: 'Per-account drivers. A score without a reason gets ignored on the second week.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'Why did the previous rules-based health score fail?',
        a: 'It measured absolute usage, so every large account looked healthy and every small one looked at risk. Normalising each feature against the account’s own trailing baseline fixed that — though it does depend on a product event stream. On billing data alone, three weeks of warning is not available.',
      },
      {
        q: 'How do you know the 27% reduction was the model?',
        a: 'The worked cohort was compared against a matched control held back from the worklist for two quarters — matched on contract value, tenure and segment. Without a control, any improvement is just a good quarter.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/churn-early-warning', external: false },
    ],
    featured: false,
    tone: 'parchment',
    reverse: false,
  },

  // ---------------------------------------------------------------- 06
  {
    slug: 'finance-close-automation',
    title: 'Month-End Close Automation',
    eyebrow: 'AUTOMATION · PYTHON · SQL',
    org: 'Manufacturing group, five entities',
    period: '2025',
    year: 2025,
    readMinutes: 6,
    tags: ['automation', 'python', 'excel', 'sql'],
    summary:
      'A nine-day month-end close cut to three, by automating the reconciliation and consolidation steps rather than asking people to work faster.',
    lead:
      'Nine working days and two late nights — that was month-end for a manufacturing group with five legal entities. Nothing was broken exactly: 61 individually reasonable manual steps, chained together with no way to run any of them twice safely. I rebuilt the pipeline so the close is a checklist with a status board rather than a relay race.',
    cover: '/images/dash/finance-close-automation.png',
    coverAlt:
      'Screenshot of the Month-End Close Automation dashboard: three headline metric cards above a bar chart of working days to close, by cycle, 9 working days at Baseline down to 3 by Cycle 6.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '9 → 3', label: 'working days to close, across five entities' },
      { value: '−142h', count: 142, prefix: '−', suffix: 'h', label: 'manual finance effort per close cycle' },
      { value: '61', count: 61, label: 'manual steps replaced by 9 idempotent jobs' },
    ],
    stack: ['Python (Pandas, openpyxl)', 'SQL Server', 'Excel', 'Power Automate', 'Git'],
    role: 'Consulting automation engineer — process mapping, build, handover',
    duration: '12 weeks',
    problem: [
      'The close depended on 61 manual steps spread across five entities and four people. Intercompany balances were reconciled by exporting two ledgers to Excel and eyeballing them; the consolidation workbook was a 40-tab file whose formulas nobody was willing to touch; and if a step was run twice, it double-posted. That last property is why nobody dared restart anything, so a single error cost half a day.',
      'The team had asked for more headcount. What they actually needed was for the repeatable 80% to stop consuming the judgement-based 20%.',
    ],
    approach: [
      {
        title: 'Mapped and timed all 61 steps',
        body:
          'Two weeks shadowing a live close, recording each step’s owner, duration, inputs and failure mode. Eleven steps turned out to be duplicated between entities and four produced output nobody read — those were deleted before a line of code was written.',
      },
      {
        title: 'Made every job idempotent',
        body:
          'Each automated step writes to a staging table keyed on entity and period, then swaps atomically. Re-running a job is always safe, which is what finally made restarting a failed close a non-event instead of a crisis.',
      },
      {
        title: 'Automated reconciliation with a tolerance ledger',
        body:
          'Intercompany and bank reconciliations run in Python against both ledgers, with materiality thresholds agreed with the controller. Matches clear silently; breaks land in a queue with both source rows attached, so the accountant starts from the exception rather than the export.',
      },
      {
        title: 'Replaced the 40-tab workbook',
        body:
          'Consolidation logic moved into version-controlled SQL with a test per elimination rule. The workbook survives as a formatted output only — it no longer contains any logic, so no one has to be afraid of it.',
      },
    ],
    results: [
      'Close time fell from 9 working days to 3 over six cycles, with no cycle regressing.',
      'Around 142 hours of manual finance effort removed per cycle, redeployed onto variance analysis and forecasting.',
      'Reconciliation breaks are now surfaced on day one rather than discovered on day six; average break count per close fell from 38 to 9 as upstream causes became visible.',
      'No late nights in any of the six cycles since go-live.',
    ],
    chart: {
      title: 'Working days to close, by cycle',
      unit: 'working days',
      series: [
        { label: 'Baseline', value: 9 },
        { label: 'Cycle 1', value: 8 },
        { label: 'Cycle 2', value: 7 },
        { label: 'Cycle 3', value: 5 },
        { label: 'Cycle 4', value: 4 },
        { label: 'Cycle 5', value: 3.5 },
        { label: 'Cycle 6', value: 3 },
      ],
    },
    gallery: [
      {
        src: '/images/image12.svg',
        alt: 'Reconciliation exception queue showing unmatched intercompany rows with both source ledgers side by side',
        caption: 'The exception queue. Matched items clear silently; the accountant only ever sees the breaks, with both source rows attached.',
        width: 768,
        height: 432,
      },
      {
        src: '/images/image13.svg',
        alt: 'Process map of the close before and after automation, showing manual steps replaced by scheduled jobs',
        caption: 'Before and after. Eleven duplicated steps and four unread outputs were deleted rather than automated.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'Did anything stay manual on purpose?',
        a: 'Yes — accruals, provisions and anything requiring judgement. The goal was to give those steps more room, not to pretend a script can make an estimate.',
      },
      {
        q: 'How is the audit trail handled?',
        a: 'Every job logs its inputs, row counts and the period it wrote to, and the staging-then-swap pattern means each posted figure traces back to an immutable run. Auditors get a run log rather than a reconstruction.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/finance-close-automation', external: false },
    ],
    featured: false,
    tone: 'dark',
    reverse: true,
  },

  // ---------------------------------------------------------------- 07
  {
    slug: 'logistics-control-tower',
    title: 'Live Logistics Control Tower',
    eyebrow: 'POWER BI · SQL · CLOUD',
    org: '3PL operator, Cork & Rotterdam',
    period: '2026',
    year: 2026,
    readMinutes: 6,
    tags: ['powerbi', 'sql', 'cloud'],
    summary:
      'One live view across four carriers and two hubs, so a delayed consignment is a phone call the same morning instead of a claim three weeks later.',
    lead:
      'Customers were the exception-detection system at a third-party logistics operator running 2,300 consignments a week out of Cork and Rotterdam, across four carrier systems that knew nothing of each other. I built a control tower that ingests all four feeds, reconciles them onto one consignment spine and puts the exceptions on a screen the operations floor actually watches.',
    cover: '/images/dash/logistics-control-tower.png',
    coverAlt:
      'Screenshot of the Live Logistics Control Tower: three headline metric cards above a line chart of on-time-in-full delivery, 88.9 % OTIF at Wk 1 up to 98.3 by Wk 19.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '+9.4pp', count: 9.4, prefix: '+', suffix: 'pp', label: 'on-time-in-full delivery over two quarters' },
      { value: '4 → 1', label: 'carrier systems reconciled onto one consignment spine' },
      { value: '11 min', count: 11, suffix: ' min', label: 'data latency, against a previous 24-hour lag' },
    ],
    stack: ['Power BI', 'SQL Server', 'Azure Data Factory', 'Azure SQL', 'Python'],
    role: 'Consulting analyst — data model, ingestion, dashboard, floor rollout',
    duration: '10 weeks',
    problem: [
      'Four carriers, four portals, four different status vocabularies and four different ideas of what a delivery date means. Operations kept a spreadsheet to bridge them, rebuilt once a day, which meant a consignment could sit stuck for 20 hours before anyone noticed. On-time-in-full was reported at 88.9% but calculated from carrier self-reporting, so nobody quite trusted it.',
      'The commercial cost was concentrated in a small number of lanes and a small number of accounts — but with the data fragmented, nobody could prove which.',
    ],
    approach: [
      {
        title: 'One consignment spine',
        body:
          'A single conforming table keyed on the internal consignment ID, with carrier references as attributes. Every carrier’s status vocabulary maps into one nine-state model agreed with the ops managers, and unmappable statuses raise an alert instead of defaulting to “in transit”.',
      },
      {
        title: 'Incremental ingestion every ten minutes',
        body:
          'Azure Data Factory pulls each carrier feed on a ten-minute cadence with watermark-based incremental loads and a dead-letter table for rows that fail validation. Two of the four had no API, so those are driven by a scheduled Python job against their export endpoint.',
      },
      {
        title: 'Exceptions defined by dwell, not by status',
        body:
          'A consignment is an exception when it has sat in one state longer than that lane’s 90th-percentile dwell time — so the definition adapts per lane rather than assuming a Rotterdam trunk behaves like a Cork city delivery.',
      },
      {
        title: 'Built for a wall, then for a desk',
        body:
          'The primary view is a floor display: exception count, worst lanes, oldest consignment. The analytical drill-down for account reviews sits behind it, sharing exactly the same measures.',
      },
    ],
    results: [
      'On-time-in-full rose from 88.9% to 98.3% over two quarters — the first reconciled week came out level with the carrier-reported baseline, so the gain is not an artefact of the new measure.',
      'Data latency fell from a 24-hour spreadsheet cycle to 11 minutes end to end.',
      'Two lanes were shown to generate 61% of all exceptions; renegotiating one carrier’s cut-off time removed most of them.',
      'Customer-raised exception queries fell by roughly half, because operations now make the call first.',
    ],
    chart: {
      title: 'On-time-in-full delivery',
      unit: '% OTIF',
      series: [
        { label: 'Wk 1', value: 88.9 },
        { label: 'Wk 3', value: 89.4 },
        { label: 'Wk 5', value: 91.2 },
        { label: 'Wk 7', value: 93.0 },
        { label: 'Wk 9', value: 94.6 },
        { label: 'Wk 11', value: 95.8 },
        { label: 'Wk 13', value: 96.9 },
        { label: 'Wk 15', value: 97.6 },
        { label: 'Wk 17', value: 98.0 },
        { label: 'Wk 19', value: 98.3 },
      ],
    },
    gallery: [
      {
        src: '/images/ai-report-07.svg',
        alt: 'Lane performance view ranking trunk and delivery lanes by exception rate and average dwell time',
        caption: 'Lane performance. Two lanes accounted for 61% of exceptions — invisible while the data sat in four portals.',
        width: 1920,
        height: 1080,
      },
      {
        src: '/images/image14.svg',
        alt: 'Floor display layout showing exception count, worst lanes and the oldest open consignment',
        caption: 'The floor display. Three numbers, readable from across the room, refreshing every ten minutes.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'Why ten minutes and not real time?',
        a: 'Two of the four carriers only publish updates in batches anyway, so sub-minute polling would have bought latency the source data does not have. Ten minutes is comfortably inside the window in which an operator can still act.',
      },
      {
        q: 'What happens to a status nobody has mapped?',
        a: 'It lands in the dead-letter table and raises an alert. Defaulting an unknown status to “in transit” is how a stuck consignment stays invisible, so the model refuses to guess.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/logistics-control-tower', external: false },
    ],
    featured: false,
    tone: 'white',
    reverse: false,
  },

  // ---------------------------------------------------------------- 08
  {
    slug: 'clinic-nlp-triage',
    title: 'NLP Triage of Inbound Clinic Enquiries',
    eyebrow: 'PYTHON · NLP · AUTOMATION',
    org: 'Private clinic group, Leinster',
    period: '2026',
    year: 2026,
    readMinutes: 7,
    tags: ['python', 'ml', 'automation'],
    summary:
      'Classifying and routing 1,900 inbound enquiries a week, with a hard rule that anything clinical or uncertain goes to a human immediately.',
    lead:
      'A private clinic group in Leinster received about 1,900 enquiries a week by email and web form into one shared inbox. Reception read every one to decide where it went; urgent items waited behind appointment-change requests. I built a triage classifier that routes the routine 70% automatically and escalates anything clinical or uncertain to a person straight away — deliberately not the other way round.',
    cover: '/images/dash/clinic-nlp-triage.png',
    coverAlt:
      'Screenshot of the NLP Triage of Inbound Clinic Enquiries dashboard: three headline metric cards above a line chart of median first-response time on routine enquiries, 6.2 hours at Wk 1 down to 1.6 by Wk 12.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '−74%', count: 74, prefix: '−', suffix: '%', label: 'median first-response time on routine enquiries' },
      { value: '96.2%', count: 96.2, suffix: '%', label: 'routing accuracy on the held-out sample' },
      { value: '100%', count: 100, suffix: '%', label: 'of clinical-flag enquiries routed to a human' },
    ],
    stack: ['Python (spaCy, scikit-learn, sentence-transformers)', 'FastAPI', 'PostgreSQL', 'Microsoft Graph API'],
    role: 'Consulting data scientist — labelling design, model, routing service',
    duration: '11 weeks',
    problem: [
      'One shared inbox, nine intents and a strictly first-in-first-out reading order. A prescription query about worsening symptoms sat behind fourteen requests to move an appointment, because nobody could tell them apart without opening each one. Median first response on routine enquiries was 6.2 hours; on the enquiries that mattered most it was no better, which was the real problem.',
      'Any solution had to be conservative by construction. In a clinical setting the cost of misrouting an urgent enquiry is not symmetrical with the cost of a receptionist reading one extra email, and the design had to encode that rather than optimise a single accuracy number.',
    ],
    approach: [
      {
        title: 'Defined the intents with reception, not for them',
        body:
          'Nine intents drawn from a sample of 3,000 historical enquiries, labelled by two reception staff with a third resolving disagreements. Inter-annotator agreement was measured before any modelling began — if two humans cannot agree on a label, no model will learn it.',
      },
      {
        title: 'A clinical-flag layer that runs first',
        body:
          'Before classification, a high-recall rule and embedding layer screens for symptom, medication, safeguarding and distress language. Anything it touches goes to a human queue immediately and is never auto-routed, whatever the classifier subsequently says.',
      },
      {
        title: 'Classification with an abstain threshold',
        body:
          'A linear classifier over sentence embeddings, tuned for precision rather than accuracy. Below the confidence threshold the model abstains and the enquiry goes to the general human queue — abstention is a valid, logged outcome, not a failure.',
      },
      {
        title: 'Routing as a reversible service',
        body:
          'A FastAPI service applies a queue label via the Graph API and writes an audit row. Every routing decision is visible, reversible by reception in one click, and every reversal is reviewed weekly as training signal.',
      },
    ],
    results: [
      'Median first-response time on routine enquiries fell from 6.2 hours to 1.6 hours — a 74% reduction — and urgent items no longer queue behind them.',
      'Routing accuracy of 96.2% on a held-out sample of 600 enquiries, measured on the 89% the model did not abstain on.',
      'Every enquiry caught by the clinical-flag layer reached a human on first touch across the twelve-week evaluation, with no auto-routing exceptions.',
      'Reception time spent sorting the inbox fell by around 14 hours a week and moved to patient-facing work.',
    ],
    chart: {
      title: 'Median first-response time on routine enquiries',
      unit: 'hours',
      series: [
        { label: 'Wk 1', value: 6.2 },
        { label: 'Wk 2', value: 6.0 },
        { label: 'Wk 3', value: 5.4 },
        { label: 'Wk 4', value: 4.5 },
        { label: 'Wk 5', value: 3.7 },
        { label: 'Wk 6', value: 3.0 },
        { label: 'Wk 7', value: 2.5 },
        { label: 'Wk 8', value: 2.1 },
        { label: 'Wk 9', value: 1.9 },
        { label: 'Wk 10', value: 1.7 },
        { label: 'Wk 11', value: 1.6 },
        { label: 'Wk 12', value: 1.6 },
      ],
    },
    gallery: [
      {
        src: '/images/image15.svg',
        alt: 'Intent confusion matrix across the nine enquiry categories, with the abstain band shown separately',
        caption: 'Confusion across the nine intents, with abstentions counted separately — a model that declines to answer is behaving correctly here.',
        width: 768,
        height: 432,
      },
      {
        src: '/images/image16.svg',
        alt: 'Routing audit log showing each decision, its confidence and any reversal made by reception',
        caption: 'The audit log. Every decision is reversible in one click, and every reversal feeds the weekly review.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'How do you handle patient data safely?',
        a: 'Processing runs inside the clinic’s own tenancy, no enquiry text leaves it, and the training corpus was pseudonymised before labelling. Retention on the audit log matches the clinic’s existing policy rather than adding a new one.',
      },
      {
        q: 'Why let the model abstain instead of forcing a best guess?',
        a: 'Because a wrong route costs more than an unrouted enquiry. Abstention keeps precision high on the queues that are automated and puts the genuinely ambiguous cases where they belong — in front of a person.',
      },
      {
        q: 'Is anything ever auto-answered?',
        a: 'No. The system routes and prioritises; it does not reply. Every patient response is written by a human.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/clinic-nlp-triage', external: false },
    ],
    featured: false,
    tone: 'dark-3',
    reverse: true,
  },

  // ---------------------------------------------------------------- 09
  {
    slug: 'energy-anomaly-detection',
    title: 'Anomaly Detection on Building Energy Telemetry',
    eyebrow: 'PYTHON · ML · CLOUD',
    org: 'Commercial property portfolio, 62 buildings',
    period: '2026',
    year: 2026,
    readMinutes: 7,
    tags: ['python', 'ml', 'cloud', 'sql'],
    summary:
      'Unsupervised detection across 1,480 meters that finds a failing plant item in hours instead of at the quarterly bill.',
    lead:
      'Every one of 1,480 half-hourly meters across a 62-building commercial portfolio was recording, and nothing was reading them. A fault surfaced when a quarterly bill looked high — typically 60 to 90 days after a chiller had started running through the night. I built unsupervised anomaly detection on the telemetry that raises a ranked, costed alert to the facilities team within hours.',
    cover: '/images/dash/energy-anomaly-detection.png',
    coverAlt:
      'Screenshot of the Anomaly Detection on Building Energy Telemetry dashboard: three headline metric cards above a bar chart of median time to detect an energy anomaly, 1512 hours at Baseline down to 4.2 by Wk 14.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '€318k', count: 318, prefix: '€', suffix: 'k', label: 'annualised energy waste identified across the portfolio' },
      { value: '4.2 h', count: 4.2, suffix: ' h', label: 'median detection time, from 60+ days' },
      { value: '1,480', count: 1480, label: 'half-hourly meters monitored continuously' },
    ],
    stack: ['Python (Pandas, scikit-learn, statsmodels)', 'BigQuery', 'Cloud Functions', 'SQL', 'Looker Studio'],
    role: 'Consulting data scientist — detection design, deployment, FM handover',
    duration: '13 weeks',
    problem: [
      'Half-hourly data existed for every meter and was effectively unread. With 1,480 series there was no realistic way for a facilities team to eyeball them, and the few thresholds someone had configured were static — so they fired constantly in January and never in June. Most alerts were ignored, which is the normal end state for an alert nobody trusts.',
      'The failures being missed were mundane and expensive: schedules left on after a bank holiday, a stuck valve, simultaneous heating and cooling, a chiller cycling all night in an empty building.',
    ],
    approach: [
      {
        title: 'A baseline per meter, not per portfolio',
        body:
          'Each meter gets its own expected profile from a seasonal-trend decomposition conditioned on day type, occupancy schedule and heating and cooling degree days. Anomaly means departure from that meter’s own expectation, which is the only definition that survives a portfolio this varied.',
      },
      {
        title: 'Two detectors, deliberately different',
        body:
          'A residual-based statistical detector catches sustained level shifts; an isolation forest over shape features catches profile changes that leave the daily total unchanged — the overnight-running case that a total-consumption check misses entirely.',
      },
      {
        title: 'Ranked by euros, not by z-score',
        body:
          'Every alert carries an estimated cost per day using the site’s actual tariff and standing charges. The facilities team works a list ordered by money, which is what made them work the list at all.',
      },
      {
        title: 'Closed the loop on outcomes',
        body:
          'Each alert is closed with a cause code by the engineer who attended. Those codes tune the detectors and, after ten weeks, let false positives be suppressed by pattern rather than by raising a global threshold.',
      },
    ],
    results: [
      'Median detection time fell from over 60 days to 4.2 hours from the onset of an anomaly.',
      '€318k of annualised waste identified in the first two quarters, of which €241k was remediated within the period.',
      'Alert precision improved from 21% at launch to 68% by week twelve as cause codes fed back into the detectors.',
      'The single largest find was a chiller running unoccupied overnight in one building for an estimated 11 weeks, at roughly €640 a week.',
    ],
    chart: {
      title: 'Median time to detect an energy anomaly',
      unit: 'hours',
      series: [
        { label: 'Baseline', value: 1512 },
        { label: 'Wk 2', value: 720 },
        { label: 'Wk 4', value: 264 },
        { label: 'Wk 6', value: 96 },
        { label: 'Wk 8', value: 36 },
        { label: 'Wk 10', value: 12 },
        { label: 'Wk 12', value: 6 },
        { label: 'Wk 14', value: 4.2 },
      ],
    },
    gallery: [
      {
        src: '/images/image17.svg',
        alt: 'Half-hourly consumption for one meter plotted against its learned baseline, with the anomalous overnight period shaded',
        caption: 'One meter against its own baseline. The overnight shoulder is the chiller — invisible in the daily total, obvious in the profile.',
        width: 768,
        height: 432,
      },
      {
        src: '/images/image20.svg',
        alt: 'Open alert queue ranked by estimated cost per day with cause codes from closed alerts',
        caption: 'The alert queue, ordered by euros per day. Cause codes from closed alerts are what lifted precision from 21% to 68%.',
        width: 768,
        height: 432,
      },
    ],
    faq: [
      {
        q: 'Why unsupervised rather than a trained fault classifier?',
        a: 'There were no labelled faults to train on — that was the whole problem. Unsupervised detection plus engineer-supplied cause codes bootstraps the labels, and a supervised layer becomes viable once enough have accumulated.',
      },
      {
        q: 'How is weather accounted for?',
        a: 'Heating and cooling degree days are covariates in each meter’s baseline, so a cold snap raises the expectation instead of raising 1,480 alerts.',
      },
      {
        q: 'What stopped this becoming another ignored alert feed?',
        a: 'Ranking by cost and closing every alert with a cause code. An alert with a euro figure attached gets attended; a z-score does not.',
      },
    ],
    links: [
      { label: 'See it on GitHub ↗', href: GH, external: true },
      { label: 'Read the case study', href: '/work/energy-anomaly-detection', external: false },
    ],
    featured: false,
    tone: 'parchment',
    reverse: false,
  },
];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const featured: Project[] = projects.filter((p) => p.featured);

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

const TOOL_LABELS: Record<ToolKey, string> = {
  tableau: 'Tableau',
  powerbi: 'Power BI',
  python: 'Python',
  sql: 'SQL',
  excel: 'Excel',
  ml: 'Machine learning',
  automation: 'Automation',
  cloud: 'Cloud',
};

const TOOL_ORDER: ToolKey[] = ['tableau', 'powerbi', 'python', 'sql', 'excel', 'ml', 'automation', 'cloud'];

export const toolFilters: { key: ToolKey | 'all'; label: string; count: number }[] = [
  { key: 'all', label: 'All', count: projects.length },
  ...TOOL_ORDER.map((key) => ({
    key,
    label: TOOL_LABELS[key],
    count: projects.filter((p) => p.tags.includes(key)).length,
  })).filter((f) => f.count > 0),
];
