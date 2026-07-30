// ============================================================
//  EXTRAS — supporting portfolio data
//  Testimonials, skill levels, credentials, headline stats,
//  the tech stack marquee, and the contribution heat-map.
//
//  Everything here is static and deterministic: the activity
//  grid is generated from an integer hash, never Math.random(),
//  so every build produces byte-identical output.
// ============================================================

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  org: string;
  initials: string;
}

export interface Skill {
  name: string;
  level: number;
  group: 'Analytics' | 'Engineering' | 'AI & ML' | 'Delivery';
}

export interface Cert {
  name: string;
  issuer: string;
  year: number;
  blurb: string;
}

export interface StatItem {
  value: string;
  count?: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export interface TechItem {
  name: string;
  kind: 'lang' | 'bi' | 'cloud' | 'ai' | 'tool';
}

// ------------------------------------------------------------
//  TESTIMONIALS — the people who signed off the work
// ------------------------------------------------------------

export const testimonials: Testimonial[] = [
  {
    quote:
      'We had four years of till data and no way to read it. Murilo rebuilt the weekly trading pack in Tableau and the Monday review went from a two-hour argument about numbers to a twenty-minute conversation about decisions.',
    name: 'Aoife Ní Bhraonáin',
    role: 'Head of Retail Operations',
    org: 'Kilbrannon Group',
    initials: 'AB',
  },
  {
    quote:
      'The month-end reconciliation used to take my team three full days of copy-and-paste. It now runs overnight and lands in my inbox with the variances already flagged. He also documented it properly, which matters more than people think.',
    name: 'Declan Moriarty',
    role: 'Financial Controller',
    org: 'Ardmore Timber & Panel',
    initials: 'DM',
  },
  {
    quote:
      'He spent a full day sitting at reception before writing any code, which is why the no-show model actually fits how the clinic runs. Our empty-chair rate is down and the front desk trusts the list it gets each morning.',
    name: 'Sinéad Gallagher',
    role: 'Practice Manager',
    org: 'Loughrea Dental & Implant Clinic',
    initials: 'SG',
  },
  {
    quote:
      'Clear scoping, no jargon, and he pushed back when we asked for a metric that would have flattered us. Our churn reporting is now something I can put in front of investors without a caveat slide.',
    name: 'Joost Meijer',
    role: 'Co-founder',
    org: 'Cadence HR, Utrecht',
    initials: 'JM',
  },
  {
    quote:
      'Depot managers were each keeping their own spreadsheet. One model, one definition of on-time, and the arguments stopped. The handover pack meant my own analyst could take it over after six weeks.',
    name: 'Marek Nowakowski',
    role: 'Transport & Logistics Lead',
    org: 'Baltrade Distribution',
    initials: 'MN',
  },
];

// ------------------------------------------------------------
//  SKILLS — honest self-assessment, 0-100
// ------------------------------------------------------------

export const skills: Skill[] = [
  // Analytics
  { name: 'Tableau', level: 93, group: 'Analytics' },
  { name: 'Power BI & DAX', level: 87, group: 'Analytics' },
  { name: 'Analytical SQL', level: 91, group: 'Analytics' },
  { name: 'Excel & Power Query', level: 85, group: 'Analytics' },
  { name: 'Statistics & experiment design', level: 74, group: 'Analytics' },

  // Engineering
  { name: 'Python (pandas, Polars)', level: 89, group: 'Engineering' },
  { name: 'PostgreSQL & BigQuery', level: 84, group: 'Engineering' },
  { name: 'dbt & dimensional modelling', level: 79, group: 'Engineering' },
  { name: 'Airflow & orchestration', level: 71, group: 'Engineering' },
  { name: 'Web automation (Playwright)', level: 82, group: 'Engineering' },

  // AI & ML
  { name: 'scikit-learn & gradient boosting', level: 81, group: 'AI & ML' },
  { name: 'Time-series forecasting', level: 77, group: 'AI & ML' },
  { name: 'Retrieval-augmented generation', level: 83, group: 'AI & ML' },
  { name: 'Prompt & evaluation design', level: 78, group: 'AI & ML' },
  { name: 'MLOps & model monitoring', level: 66, group: 'AI & ML' },

  // Delivery
  { name: 'Stakeholder workshops', level: 88, group: 'Delivery' },
  { name: 'Requirements discovery', level: 84, group: 'Delivery' },
  { name: 'Documentation & handover', level: 86, group: 'Delivery' },
];

// ------------------------------------------------------------
//  CREDENTIALS
// ------------------------------------------------------------

export const certs: Cert[] = [
  {
    name: 'BSc — Analysis & Development of Systems',
    issuer: 'FIAP',
    year: 2024,
    blurb:
      'Three-year degree in São Paulo covering databases, software engineering and applied statistics; final-year project was a churn-prediction pipeline.',
  },
  {
    name: 'Tableau Desktop Specialist',
    issuer: 'Tableau · Salesforce',
    year: 2023,
    blurb:
      'Certification on data connections, level-of-detail expressions and dashboard design for production reporting.',
  },
  {
    name: 'Power BI Data Analyst Associate (PL-300)',
    issuer: 'Microsoft',
    year: 2024,
    blurb:
      'Modelling, DAX and row-level security for governed self-service reporting across an organisation.',
  },
  {
    name: 'Professional Data Engineer',
    issuer: 'Google Cloud',
    year: 2025,
    blurb:
      'Designing and operating batch and streaming pipelines on BigQuery, Dataflow and Cloud Composer.',
  },
  {
    name: 'dbt Analytics Engineering Certification',
    issuer: 'dbt Labs',
    year: 2025,
    blurb:
      'Testing, documentation and incremental modelling patterns for a warehouse that other people have to maintain.',
  },
  {
    name: 'Certified Data Analyst Associate',
    issuer: 'Databricks',
    year: 2026,
    blurb:
      'Lakehouse SQL, Unity Catalog governance and analytics workloads over large partitioned tables.',
  },
];

// ------------------------------------------------------------
//  HEADLINE STATS — four numbers, count-up ready
// ------------------------------------------------------------

export const stats: StatItem[] = [
  { value: '42', count: 42, suffix: '+', label: 'Data projects delivered' },
  { value: '1,900', count: 1900, suffix: ' hrs', label: 'Manual work automated each year' },
  { value: '12', count: 12, suffix: ' TB', label: 'Transactional data modelled' },
  { value: '5', count: 5, label: 'Languages spoken' },
];

// ------------------------------------------------------------
//  TECH STACK — tools in current, regular use
// ------------------------------------------------------------

export const techStack: TechItem[] = [
  { name: 'Python', kind: 'lang' },
  { name: 'SQL', kind: 'lang' },
  { name: 'TypeScript', kind: 'lang' },
  { name: 'DAX', kind: 'lang' },

  { name: 'Tableau', kind: 'bi' },
  { name: 'Power BI', kind: 'bi' },
  { name: 'Looker Studio', kind: 'bi' },
  { name: 'Excel', kind: 'bi' },

  { name: 'BigQuery', kind: 'cloud' },
  { name: 'PostgreSQL', kind: 'cloud' },
  { name: 'Snowflake', kind: 'cloud' },
  { name: 'Google Cloud', kind: 'cloud' },
  { name: 'Azure', kind: 'cloud' },

  { name: 'scikit-learn', kind: 'ai' },
  { name: 'Prophet', kind: 'ai' },
  { name: 'Hugging Face', kind: 'ai' },
  { name: 'LangChain', kind: 'ai' },

  { name: 'dbt', kind: 'tool' },
  { name: 'Airflow', kind: 'tool' },
  { name: 'Git', kind: 'tool' },
  { name: 'Docker', kind: 'tool' },
  { name: 'Playwright', kind: 'tool' },
];

// ------------------------------------------------------------
//  ACTIVITY HEAT-MAP — 52 weeks × 7 days, values 0-4
//
//  Deterministic by construction: a 32-bit integer hash of the
//  cell index drives the noise, so there is no Math.random() and
//  no Date.now() anywhere. The same source always builds the
//  same grid.
// ------------------------------------------------------------

const WEEKS = 52;
const DAYS = 7;

/** Fixed 32-bit avalanche hash -> a stable fraction in [0, 1). */
function cellNoise(index: number): number {
  let h = Math.imul(index ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Monday-first weekday weighting — visibly quieter at weekends. */
const DAY_WEIGHT = [1.02, 1.0, 1.04, 0.96, 0.88, 0.34, 0.2];

export const activity: number[][] = Array.from({ length: WEEKS }, (_, week) =>
  Array.from({ length: DAYS }, (_, day) => {
    // Gentle seasonal swell so the year has a shape (busier springs
    // and autumns, a dip over the summer and Christmas weeks).
    const seasonal = 0.86 + 0.34 * Math.sin((week / WEEKS) * Math.PI * 4 + 0.7);
    const noise = cellNoise(week * DAYS + day + 1);
    const raw = DAY_WEIGHT[day] * seasonal * (0.3 + 1.35 * noise);

    if (raw < 0.2) return 0;
    if (raw < 0.62) return 1;
    if (raw < 1.0) return 2;
    if (raw < 1.32) return 3;
    return 4;
  })
);

/**
 * Week labels: 52 consecutive Mondays, the last of them 2026-07-27.
 * Built from a hard-coded date so the output never depends on when
 * the site is built.
 */
const LAST_WEEK_START = '2026-07-27'; // a Monday

export const activityWeeks: string[] = Array.from({ length: WEEKS }, (_, i) => {
  const d = new Date(`${LAST_WEEK_START}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (WEEKS - 1 - i) * 7);
  return d.toISOString().slice(0, 10);
});

/** Total contributions across the window — handy for a caption. */
export const activityTotal: number = activity.reduce(
  (sum, week) => sum + week.reduce((a, b) => a + b, 0),
  0
);
