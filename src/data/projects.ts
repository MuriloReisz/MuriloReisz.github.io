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

/** One slot in the four-part impact band. Deliberately the same shape as
    Finding so the existing [data-counter-to] handler in motion.ts animates it
    with no new client code — `note` is the only addition. */
export interface ImpactMetric extends Finding {
  note?: string;
}

/** The four questions a buyer asks, in a fixed order on every case study:
    what came back, what time was returned, what it took to build, how good it
    is. Same four slots, same order, every project — that consistency is the
    point. */
export interface ProjectImpact {
  value: ImpactMetric;
  time: ImpactMetric;
  effort: ImpactMetric;
  quality: ImpactMetric;
}

/** A single before → after comparison. The delta is computed at render time
    from these two numbers rather than stored, so it can never drift out of
    step with them. `better` says which direction is an improvement, which is
    what decides the sign and the colour of the delta chip. */
export interface BeforeAfterRow {
  metric: string;
  before: number;
  after: number;
  unit: string;
  better: 'lower' | 'higher';
}

export interface GalleryItem {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/** The internal tool identity for this engagement — not the client's own
    brand, but the product name and colourway the dashboard was skinned in,
    so each case study reads as its own build rather than a Murilo-violet
    template. */
export interface ProjectBrand {
  wordmark: string;
  accent: string;
  accent2: string;
}

/** The inline-style value every brand chip (.pc-card__badge, .cse-brandchip,
    .work__brandchip) needs — kept in one place so the two CSS custom
    property names only have to match here, not at every call site. */
export function brandChipStyle(brand: ProjectBrand): string {
  return `--chip-a:${brand.accent}; --chip-a2:${brand.accent2}`;
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
  brand: ProjectBrand;
  cover: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  findings: Finding[];
  impact: ProjectImpact;
  beforeAfter: BeforeAfterRow[];
  /** An anonymised composite scenario rather than a named client engagement.
      Rendered with a visible badge on the card and the case study, so an
      illustrative figure is never mistaken for a delivered client result. */
  illustrative?: boolean;
  stack: string[];
  role: string;
  duration: string;
  problem: string[];
  approach: { title: string; body: string }[];
  results: string[];
  /** Optional: only projects with a real measured series get a chart. */
  chart?: { title: string; unit: string; series: ChartPoint[] };
  gallery: GalleryItem[];
  faq: { q: string; a: string }[];
  links: { label: string; href: string; external: boolean }[];
  featured: boolean;
  tone: 'white' | 'parchment' | 'dark' | 'dark-3';
  reverse: boolean;
}

const GH = 'https://github.com/MuriloReisz';

export const projects: Project[] = [
  // ---------------------------------------------------------------- 03
  // Cork AI Consulting's own delivery tooling. Facts are the CV's: what it
  // does, and that the first assessment shipped in August 2026. No client
  // detail, and no outcome figures until a client has signed one off.
  {
    slug: 'ai-opportunity-assessment',
    title: 'AI Opportunity Assessment Engine',
    eyebrow: 'CLAUDE API · AGENTS · PYTHON',
    org: 'Cork AI Consulting',
    brand: { wordmark: 'Assessment Engine', accent: '#0f8a6c', accent2: '#3fb894' },
    period: '2026',
    year: 2026,
    readMinutes: 4,
    tags: ['ml', 'automation', 'python'],
    summary:
      'An agent that turns a discovery-call transcript into a client-branded, ROI-backed report — with an honesty check that blocks any claim the call didn’t support.',
    lead:
      'Cork AI Consulting sells one entry product: a paid AI Opportunity Assessment that finds where a business loses time and money and prices the fix. Writing each report by hand was slow and its quality depended on the writer. I built the engine that drafts it from the call itself, and a gate that refuses to let it overclaim.',
    cover: '/images/dash/ai-opportunity-assessment.svg',
    coverAlt:
      'Architecture diagram: discovery-call transcript flows into extraction, opportunity sizing and an honesty gate before rendering a client-branded report.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: 'Aug 2026', label: 'first assessment delivered to a paying client' },
      { value: 'Transcript → report', label: 'one pipeline, client-branded output' },
      { value: 'Honesty gate', label: 'unsupported claims are blocked, not softened' },
    ],
    impact: {
      value: { value: 'ROI-backed', label: 'Every opportunity priced', note: 'Each recommendation carries hours returned and cost, traced to what was said on the call.' },
      time: { value: 'Agent-drafted', label: 'Report drafting', note: 'Drafting moved from a manual write-up to an agent run plus human review.' },
      effort: { value: 'Co-founder build', label: 'Built in-house', note: 'Designed and built as part of setting up the consultancy’s delivery.' },
      quality: { value: '0', count: 0, label: 'Unsupported claims shipped', note: 'A claim without a source line in the transcript fails the gate and goes back for review.' },
    },
    beforeAfter: [],
    stack: ['Claude API', 'Claude Code', 'Python', 'Structured outputs', 'HTML/PDF rendering', 'Git'],
    role: 'Co-founder — design and build',
    duration: 'Summer 2026, in production since August',
    problem: [
      'A good assessment needs two things that pull against each other: it has to be specific enough that the owner recognises their own business, and conservative enough that every number survives a sceptical accountant.',
      'Written by hand, reports were slow and their quality depended on who wrote them. Written naively by an LLM, they read well and invent savings. Neither is acceptable for a product whose whole promise is honesty.',
    ],
    approach: [
      { title: 'Extract before writing', body: 'The transcript is first turned into structured facts — processes, volumes, hours, tools, pain points — each tied to the line it came from. Nothing downstream is allowed to use a fact without that citation.' },
      { title: 'Size opportunities conservatively', body: 'Each candidate automation is priced from the client’s own stated volumes and a deliberately conservative hourly cost, so the headline number is a floor rather than a pitch.' },
      { title: 'An honesty gate with teeth', body: 'A separate check reads the draft against the extracted facts and blocks any claim that has no source. Failing claims are removed or sent back for a human decision — never quietly reworded.' },
      { title: 'Client-branded, human-reviewed', body: 'The report renders in the client’s colours and logo, and a consultant reviews it before it is sent. The agent does the drafting; a person signs it.' },
    ],
    results: [
      'First assessment delivered to a client in August 2026.',
      'Report drafting moved from a manual write-up to an agent run plus a human review.',
      'Every figure in a delivered report can be traced back to something the client actually said.',
    ],
    gallery: [],
    faq: [
      { q: 'Why not just let the model write the report?', a: 'Because it will. Fluent, specific and wrong is the worst possible output for an ROI document. Separating extraction, sizing and checking is what makes the output defensible.' },
      { q: 'Does client data leave the engagement?', a: 'Transcripts are processed for that client’s report only and are not reused across clients.' },
    ],
    links: [
      { label: 'Cork AI Consulting ↗', href: 'https://corkaiconsulting.ie', external: true },
    ],
    featured: true,
    tone: 'white',
    reverse: false,
  },

  // ---------------------------------------------------------------- 04
  // Apple EMEIA. Mechanics only, exactly as the CV states them: no programme
  // name, no internal system, no figures beyond the CV's own wording.
  {
    slug: 'customer-approval-agent',
    title: 'Customer-Approval Agent Pipeline',
    eyebrow: 'PLAYWRIGHT · SNOWFLAKE · CLAUDE CODE',
    org: 'Apple · EMEIA Sales',
    brand: { wordmark: 'Approval Pipeline', accent: '#2f6fdd', accent2: '#5a9af0' },
    period: '2025 — 2026',
    year: 2026,
    readMinutes: 4,
    tags: ['automation', 'python', 'sql', 'tableau', 'ml'],
    summary:
      'An automated pipeline that approves or rejects customers against sales-programme business rules — replacing hours of daily manual review and sharply cutting false rejections.',
    lead:
      'On Apple’s EMEIA Sales Business Process Re-engineering & Systems team, programme eligibility was checked by hand: people opening records, cross-referencing systems and applying rules from memory. I co-built the pipeline that does it automatically, and the dashboards that show leadership how the programmes are performing.',
    cover: '/images/dash/customer-approval-agent.svg',
    coverAlt:
      'Architecture diagram: scheduled Playwright collection feeds Snowflake, a rules engine with an agent-assisted review step decides approve or reject, and Tableau reports the results.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: 'Hours daily', label: 'of manual review eliminated' },
      { value: 'Fewer false rejections', label: 'rules applied the same way every time' },
      { value: 'Multi-billion', label: 'dollar sales programmes supported across EMEIA' },
    ],
    impact: {
      value: { value: 'Multi-$bn', label: 'Programmes supported', note: 'The pipeline and dashboards served sales programmes run and tracked by Account Executives and senior leadership.' },
      time: { value: 'Hours / day', label: 'Manual review removed', note: 'Daily eligibility checks moved from people to a scheduled run.' },
      effort: { value: 'Co-built', label: 'Team delivery', note: 'Built with the BPR & Systems team, Nov 2025 – Oct 2026.' },
      quality: { value: '1 ruleset', label: 'Same rules, every record', note: 'Business rules live in code, so two reviewers can no longer reach two answers.' },
    },
    beforeAfter: [],
    stack: ['Python (Pandas, Playwright, Selenium)', 'Snowflake', 'SQL', 'Claude Code', 'Tableau', 'Excel'],
    role: 'Data Analyst — co-built the pipeline, built the dashboards',
    duration: 'November 2025 – October 2026',
    problem: [
      'Customer eligibility for sales programmes was decided by people reading records and applying business rules by hand. It took hours every day, it scaled with volume, and different reviewers reached different answers — so eligible customers were sometimes rejected.',
      'The data needed for the decision was spread across web tools without convenient exports, which is why the work had stayed manual.',
    ],
    approach: [
      { title: 'Collect with browser automation', body: 'Playwright workflows gather and validate the data a reviewer used to collect by hand, on a schedule, with checks that fail loudly rather than load partial data.' },
      { title: 'Land it in Snowflake', body: 'Everything lands in Snowflake, so decisions and reporting work from the same governed tables.' },
      { title: 'Rules in code, agent for the edges', body: 'Programme business rules are encoded explicitly. Claude Code was used to build and maintain the pipeline quickly and to handle the awkward cases the rules alone could not.' },
      { title: 'Visible to leadership', body: 'Tableau dashboards on live Snowflake data show sales performance, KPIs and underperforming regions, so the people running the programmes see the effect directly.' },
    ],
    results: [
      'Hours of daily manual review eliminated.',
      'False rejections sharply reduced, because every record is judged against the same rules.',
      'Playwright workflows replaced manual data collection, validation and reporting for the team.',
      'Predictive scripts on programme sales data supported forecasting and targeted outreach to historical customers.',
    ],
    gallery: [],
    faq: [
      { q: 'Can you share the dashboards or data?', a: 'No — they are Apple’s. This write-up describes the approach only; I am happy to go deeper on the engineering on a call.' },
    ],
    links: [
      { label: 'LinkedIn ↗', href: 'https://www.linkedin.com/in/murilo-reis-data/', external: true },
    ],
    featured: true,
    tone: 'dark',
    reverse: true,
  },

  // ---------------------------------------------------------------- 05
  {
    slug: 'instagram-dm-assistant',
    title: 'Guardrailed Instagram DM Assistant',
    eyebrow: 'META MESSENGER PLATFORM · LLM · GUARDRAILS',
    org: 'Cork AI Consulting',
    brand: { wordmark: 'DM Assistant', accent: '#c13584', accent2: '#e1306c' },
    period: '2026',
    year: 2026,
    readMinutes: 3,
    tags: ['ml', 'automation', 'cloud'],
    summary:
      'A 24/7 assistant that answers customer enquiries in Instagram DMs within strict rules — and hands over to a person rather than ever making an answer up.',
    lead:
      'Small businesses lose sales in their DMs: questions arrive at night and on weekends, and a slow reply is a lost customer. A chatbot that improvises is worse than no reply. This assistant answers only from approved facts and escalates everything else.',
    cover: '/images/dash/instagram-dm-assistant.svg',
    coverAlt:
      'Architecture diagram: Instagram DM webhook goes to an assistant constrained by an approved knowledge base and rules; answers within scope are sent, everything else is escalated to the owner.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '24/7', label: 'replies to customer enquiries' },
      { value: 'Rules-bound', label: 'answers only from approved facts' },
      { value: 'Human handover', label: 'when a question is out of scope' },
    ],
    impact: {
      value: { value: '24/7', label: 'Always answering', note: 'Enquiries get a reply at any hour, not the next working day.' },
      time: { value: 'Routine DMs', label: 'Handled automatically', note: 'Opening hours, prices, availability — the questions owners answer twenty times a week.' },
      effort: { value: 'Meta platform', label: 'Built on official APIs', note: 'Uses Meta’s Messenger Platform for Instagram, within its policies.' },
      quality: { value: '0', count: 0, label: 'Made-up answers allowed', note: 'If the approved facts don’t cover it, the assistant says so and passes it to a person.' },
    },
    beforeAfter: [],
    stack: ['Meta Messenger Platform (Instagram)', 'Claude API', 'JavaScript / Node', 'Webhooks', 'Vercel'],
    role: 'Co-founder — design and build',
    duration: '2026',
    problem: [
      'Owners of small businesses answer the same DM questions over and over, usually outside working hours. Replies are slow, and enquiries go cold.',
      'Generic AI chatbots fix the speed and break the trust: they guess, and a confident wrong price or opening time costs more than a slow right one.',
    ],
    approach: [
      { title: 'A closed book, not an open one', body: 'The assistant answers from an approved set of business facts and rules. It is not allowed to fill gaps from general knowledge.' },
      { title: 'Refusal as a feature', body: 'Out-of-scope or uncertain questions get a polite holding reply and are escalated to the owner, with the conversation attached.' },
      { title: 'Official platform only', body: 'Built on Meta’s Messenger Platform webhooks and messaging APIs — no scraping or unofficial clients.' },
    ],
    results: [
      'Customer enquiries answered 24/7 within strict rules.',
      'Out-of-scope questions reach the owner instead of getting an invented answer.',
    ],
    gallery: [],
    faq: [
      { q: 'What stops it hallucinating?', a: 'It only answers from approved content, and anything it cannot ground in that content is escalated instead of answered.' },
    ],
    links: [],
    featured: false,
    tone: 'parchment',
    reverse: false,
  },

  // ---------------------------------------------------------------- 06
  {
    slug: 'agent-skills-library',
    title: 'Agent Skills Library & Knowledge Sync',
    eyebrow: 'CLAUDE CODE · CODEX · GIT · NOTION',
    org: 'Cork AI Consulting',
    brand: { wordmark: 'Skills Library', accent: '#d97757', accent2: '#e8a17f' },
    period: '2026',
    year: 2026,
    readMinutes: 3,
    tags: ['ml', 'automation'],
    summary:
      '28 standalone AI workflows turned into one shared, version-controlled skills library — plus a knowledge base that keeps Git and Notion in sync as a single source of truth.',
    lead:
      'A two-founder consultancy runs on prompts, scripts and agent workflows. Ours had grown into 28 separate ones, living in different folders and tools, so every improvement helped one person once. I turned them into a library both of us — and every coding agent we use — load the same way.',
    cover: '/images/dash/agent-skills-library.svg',
    coverAlt:
      'Diagram: 28 scattered workflows consolidated into a versioned skills library used by Claude Code and Codex, with a knowledge base synced between Git and Notion.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '28 → 1', count: 28, label: 'workflows consolidated into one library' },
      { value: 'Git ⇄ Notion', label: 'synced automatically, one source of truth' },
      { value: 'Multi-agent', label: 'same skills for Claude Code and Codex' },
    ],
    impact: {
      value: { value: '28', count: 28, label: 'Workflows turned into skills', note: 'Each one versioned, documented and reusable by both founders.' },
      time: { value: 'Shared', label: 'Improvements compound', note: 'A fix to one skill reaches everyone and every agent on the next pull.' },
      effort: { value: 'Internal', label: 'Built for our own delivery', note: 'The tooling the consultancy runs on, day to day.' },
      quality: { value: 'Versioned', label: 'Reviewed like code', note: 'Skills live in Git, so changes are visible, reviewable and reversible.' },
    },
    beforeAfter: [],
    stack: ['Claude Code', 'Codex CLI', 'MCP', 'Git / GitHub', 'Notion API', 'Node', 'Markdown'],
    role: 'Co-founder — design and build',
    duration: '2026',
    problem: [
      'Agent workflows multiply quickly. Without structure they end up duplicated, slightly different on each machine, and impossible to improve together.',
      'The company’s knowledge was split between Git, where the agents work, and Notion, where people work — so one of them was always out of date.',
    ],
    approach: [
      { title: 'One library, one format', body: 'Every workflow became a skill with the same structure — purpose, inputs, steps, guardrails — so any agent can discover and run it.' },
      { title: 'Version-controlled like code', body: 'Skills live in a shared Git repository. Changes are reviewed, history is kept, and nothing is lost when a laptop is replaced.' },
      { title: 'Git and Notion kept in sync', body: 'An automatic sync keeps the knowledge base consistent across both, so people and agents read the same truth.' },
    ],
    results: [
      '28 standalone AI workflows consolidated into one shared skills library.',
      'A knowledge base that syncs Git and Notion automatically as one source of truth.',
    ],
    gallery: [],
    faq: [],
    links: [],
    featured: false,
    tone: 'white',
    reverse: true,
  },

  // ---------------------------------------------------------------- 07
  // Murilo's own reselling business — his data, his product, so it can be
  // shown in full.
  {
    slug: 'vinted-tracker',
    title: 'Vinted Tracker — Reselling Analytics & AI Sales Agent',
    eyebrow: 'PYTHON · STREAMLIT · SQLITE · LLM',
    org: 'Own product',
    brand: { wordmark: 'Vinted Tracker', accent: '#007782', accent2: '#2fa5ad' },
    period: '2026',
    year: 2026,
    readMinutes: 4,
    tags: ['python', 'sql', 'ml', 'automation'],
    summary:
      'A local-first analytics app for my own vintage reselling business: inventory, P&L, market research, and an AI agent that drafts listings from photos.',
    lead:
      'I resell vintage, streetwear and shoes on Vinted. Spreadsheets stopped working once stock ran into the hundreds, so I built the tool I wanted: every item from purchase to sale, true profit after fees, and an agent that turns a handful of photos into a ready-to-list draft.',
    cover: '/images/dash/vinted-tracker.svg',
    coverAlt:
      'Diagram of the Vinted Tracker app: inventory and sales in SQLite feed P&L, analytics and market research pages, and a sales agent turns photos into listing drafts.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '780+', count: 780, suffix: '+', label: 'automated tests, every page in both themes' },
      { value: '194', count: 194, label: 'orders tracked across 183 inventory items' },
      { value: 'Local-first', label: 'SQLite on disk, no data leaves the machine' },
    ],
    impact: {
      value: { value: '194', count: 194, label: 'Orders in the ledger', note: 'Across 183 items, with purchase cost, fees and shipping per item — true profit, not revenue.' },
      time: { value: 'Photo → draft', label: 'Listing workflow', note: 'The agent drafts the listing from photos; I review and publish in Vinted’s own form.' },
      effort: { value: 'Solo', label: 'Designed, built, used daily', note: 'Product, data model, UI and agent — all mine.' },
      quality: { value: '780+', count: 780, suffix: '+', label: 'Tests', note: 'Every page is rendered in Streamlit’s real runtime, light and dark, empty and seeded DB.' },
    },
    beforeAfter: [],
    stack: ['Python', 'Streamlit', 'SQLite', 'Pandas', 'LLM vision API', 'pytest'],
    role: 'Owner — product, engineering and data',
    duration: '2026, ongoing',
    problem: [
      'Reselling looks profitable until fees, shipping and slow-moving stock are counted. With hundreds of items, a spreadsheet could no longer say what was actually making money.',
      'Listing is the bottleneck: photographing, writing and pricing each item by hand takes longer than sourcing it.',
    ],
    approach: [
      { title: 'One record per item, purchase to sale', body: 'Inventory, costs, fees and sales live in SQLite, so every chart is computed from the same ledger.' },
      { title: 'Analytics that answer real questions', body: 'P&L, sell-through, time-to-sale and category performance — what to buy more of and what to stop buying.' },
      { title: 'An assisted sales agent', body: 'The agent drafts title, description and suggested price from photos. Publishing stays manual in Vinted’s own form — no reverse-engineered writes.' },
      { title: 'Tested like production software', body: '780+ tests, including rendering every page in Streamlit’s real runtime in both themes against seeded and empty databases.' },
    ],
    results: [
      '194 orders and 183 items in one ledger — a single source of truth for stock, cost and profit.',
      'Listing drafts produced from photos, reviewed and published by me.',
      '780+ automated tests guarding every page and calculation.',
    ],
    gallery: [],
    faq: [
      { q: 'Does it post to Vinted automatically?', a: 'No, deliberately. The agent drafts; I confirm and publish in Vinted’s own sell form.' },
    ],
    links: [],
    featured: true,
    tone: 'parchment',
    reverse: false,
  },

  // ---------------------------------------------------------------- 08
  {
    slug: 'job-hunt-pipeline',
    title: 'Truthful Job-Search Pipeline',
    eyebrow: 'PYTHON · SQLITE · CLI · AGENTS',
    org: 'Personal project',
    brand: { wordmark: 'job-hunt', accent: '#5b5bd6', accent2: '#8e8ef0' },
    period: '2026',
    year: 2026,
    readMinutes: 3,
    tags: ['python', 'sql', 'automation', 'ml'],
    summary:
      'A personal pipeline that collects roles from official job-board APIs, scores them Hot/Warm/Cold, tracks them in SQLite, and builds a tailored CV per role — verified so it can never invent anything.',
    lead:
      'Job searching is a data problem: many sources, inconsistent formats, and a CV that should be tailored every time. I built a pipeline that does the collecting and scoring, and a CV builder with a verifier that checks every title, date and number against a single source profile.',
    cover: '/images/dash/job-hunt-pipeline.svg',
    coverAlt:
      'Diagram: Greenhouse, Lever, Ashby and Workday feeds flow into a scorer and SQLite tracker, then a CV builder with a verification step outputs a tailored PDF and DOCX.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '1,350', count: 1350, label: 'roles collected from 71 companies' },
      { value: '154 hot', count: 154, suffix: ' hot', label: 'of 1,245 scored roles flagged as strong matches' },
      { value: 'Verified CVs', label: 'every claim checked against one source profile' },
    ],
    impact: {
      value: { value: 'Tailored', label: 'CV per role', note: 'PDF and DOCX generated per application, with a gaps note.' },
      time: { value: '1,245', count: 1245, label: 'Roles scored automatically', note: '154 hot, 658 warm, 433 cold — no manual triage.' },
      effort: { value: 'Solo', label: 'Personal tool', note: 'Typer CLI, SQLite and an HTML dashboard.' },
      quality: { value: '0', count: 0, label: 'Invented claims', note: 'A verifier rejects any title, date, number or skill not in the source profile.' },
    },
    beforeAfter: [],
    stack: ['Python', 'Typer', 'SQLite', 'Greenhouse / Lever / Ashby APIs', 'python-docx', 'Headless Chrome'],
    role: 'Sole developer',
    duration: '2026',
    problem: [
      'Relevant roles are scattered across dozens of company career sites, each with its own format.',
      'Tailoring a CV per role is slow, and AI tools happily “improve” a CV by inventing experience.',
    ],
    approach: [
      { title: 'Official sources only', body: 'Greenhouse, Lever and Ashby public APIs, Workday career feeds and pasted links — no LinkedIn or Indeed scraping.' },
      { title: 'Score, then track', body: 'Each role is scored Hot/Warm/Cold against my profile and tracked in SQLite through to application status.' },
      { title: 'A CV builder that cannot lie', body: 'Tailored CVs are generated from one source profile, and a verifier checks every title, date, number and skill before output.' },
    ],
    results: [
      '1,350 roles collected from 71 companies; 1,245 scored — 154 hot, 658 warm, 433 cold.',
      'A tailored, verified CV and gaps note for each application.',
    ],
    gallery: [],
    faq: [],
    links: [],
    featured: false,
    tone: 'white',
    reverse: true,
  },

  // ---------------------------------------------------------------- 09
  {
    slug: 'blarneykey',
    title: 'BlarneyKey — Private, Offline AI Dictation for macOS',
    eyebrow: 'SWIFT · WHISPER · ON-DEVICE AI',
    org: 'Cork AI Consulting',
    brand: { wordmark: 'BlarneyKey', accent: '#1f8a4c', accent2: '#4cb878' },
    period: '2026',
    year: 2026,
    readMinutes: 3,
    tags: ['ml', 'automation'],
    summary:
      'Push-to-talk dictation for the Mac that runs Whisper on the Neural Engine — no network, no subscription, nothing leaves the machine.',
    lead:
      'Cloud dictation sends every word you say to someone else’s server, and charges monthly for it. Douglas and I built BlarneyKey to prove the opposite: fast, accurate speech-to-text that runs entirely on the Mac, free, and open on GitHub.',
    cover: '/images/dash/blarneykey.svg',
    coverAlt:
      'Diagram: hold a hotkey, audio is captured locally, transcribed by Whisper on the Apple Neural Engine, and typed into the active app — with no network step.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '0', count: 0, label: 'bytes of audio sent over the network' },
      { value: '€0', label: 'free, no subscription' },
      { value: 'Open source', label: 'public on GitHub' },
    ],
    impact: {
      value: { value: '€0', label: 'Cost to the user', note: 'Free, with no account and no subscription.' },
      time: { value: 'Push-to-talk', label: 'Hold, speak, release', note: 'Text lands in whatever app has focus.' },
      effort: { value: 'Co-built', label: 'With Douglas Woollam', note: 'Shipped as part of the Cork AI Consulting products showcase.' },
      quality: { value: '100%', count: 100, suffix: '%', label: 'On-device', note: 'Whisper runs on the Apple Neural Engine; the app works offline.' },
    },
    beforeAfter: [],
    stack: ['Swift', 'SwiftUI', 'Whisper', 'Apple Neural Engine', 'macOS'],
    role: 'Co-builder, with Douglas Woollam',
    duration: '2026, shipped',
    problem: [
      'Dictation is one of the most useful everyday AI tools, and most options send your voice to the cloud and bill you monthly — a poor fit for anyone handling client or personal information.',
    ],
    approach: [
      { title: 'On-device by design', body: 'Whisper runs locally on the Apple Neural Engine, so speed comes from the hardware and privacy is a property of the architecture, not a policy.' },
      { title: 'One gesture', body: 'Hold a key, speak, release: the transcript is typed into the active app, with no window to manage.' },
      { title: 'Open and free', body: 'Published publicly on GitHub so anyone can read exactly what it does.' },
    ],
    results: [
      'Shipped as a free macOS app with a public repository.',
      'Featured as a live demo in the Cork AI Consulting products showcase.',
    ],
    gallery: [],
    faq: [],
    links: [{ label: 'Source on GitHub ↗', href: 'https://github.com/AirDoogle/blarneykey', external: true }],
    featured: false,
    tone: 'parchment',
    reverse: false,
  },

  // ---------------------------------------------------------------- 01
  {
    slug: 'freelance-automation-bi',
    title: 'Freelance Automation & BI Solutions',
    eyebrow: 'PYTHON · RPA · SQL',
    org: 'Freelance',
    brand: { wordmark: 'Freelance BI Suite', accent: '#6d5ef0', accent2: '#8f7ff5' },
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
    impact: {
      value: {
        value: '€39k',
        count: 39,
        prefix: '€',
        suffix: 'k',
        label: 'Annualised labour cost returned',
        note: 'Per client, on 30.5 hours a week at a deliberately conservative €25/hour loaded cost.',
      },
      time: {
        value: '30.5h',
        count: 30.5,
        suffix: 'h',
        label: 'Hours given back each week',
        note: 'Across the automated processes — 38 hours a week at baseline, 7.5 by week 14.',
      },
      effort: {
        value: '4—14 weeks',
        label: 'Effort per engagement',
        note: 'Sole delivery: consultation, architecture, build, deployment and handover.',
      },
      quality: {
        value: '100%',
        count: 100,
        suffix: '%',
        label: 'Handed over, documented, owned',
        note: 'Every build ships with a runbook, a named owner and Git history. The client owns it, not me.',
      },
    },
    beforeAfter: [
      { metric: 'Manual hours per week', before: 38, after: 7.5, unit: 'hours', better: 'lower' },
      { metric: 'Steps needing manual copy-paste', before: 24, after: 3, unit: 'steps', better: 'lower' },
      { metric: 'Reporting lag', before: 7, after: 0.5, unit: 'days', better: 'lower' },
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
        src: '/images/gallery/freelance-automation-bi-1.png',
        alt: 'Pipeline specification sheet listing source systems, load cadence, validation rules and owners',
        caption: 'The spec sheet each engagement is signed off against — sources, cadence, validation rules and a named owner per table.',
        width: 1400,
        height: 800,
      },
      {
        src: '/images/gallery/freelance-automation-bi-2.png',
        alt: 'Wireframe of the client reporting layout, mapping each KPI to its underlying warehouse table',
        caption: 'Reporting wireframe. Every tile is traced back to a warehouse table before anyone opens Power BI.',
        width: 1400,
        height: 800,
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
      { label: 'Read the case study', href: '/work/freelance-automation-bi/', external: false },
    ],
    featured: false,
    tone: 'parchment',
    reverse: true,
  },

  // ---------------------------------------------------------------- 02
  // Cork AI Consulting. Anonymised on purpose: the engagements behind this
  // shape of work are live and confidential, so there is no client name, no
  // logo, no sector specific enough to identify anyone, and every figure here
  // is an illustrative composite rather than a delivered client result.
  {
    slug: 'drawing-to-cad-automation',
    title: 'Drawing-to-CAD Conversion Pipeline',
    eyebrow: 'AI · AUTOMATION',
    org: 'Cork AI Consulting · architecture practice',
    brand: { wordmark: 'DraftLift', accent: '#0b7285', accent2: '#3bc9db' },
    period: '2026',
    year: 2026,
    readMinutes: 6,
    tags: ['ml', 'automation', 'python'],
    summary:
      'Hand-drawn and scanned plans turned into dimensioned, editable CAD geometry — with the dimensions checked, not guessed.',
    lead:
      'An architecture practice was redrawing survey sketches and scanned legacy plans in CAD by hand, one set at a time. I built a pipeline that lifts the geometry automatically and — the part that actually matters — validates every dimension against the source before anything reaches a drafter. A conversion that is 95% right is not useful in this trade; it is a rework ticket.',
    cover: '/images/dash/drawing-to-cad-automation.png',
    coverAlt:
      'Screenshot of the Drawing-to-CAD Conversion Pipeline: three headline metric cards above a bar chart of hours to convert one drawing set, 11 hours at Baseline down to 2.5 by Wk 8.',
    coverWidth: 1600,
    coverHeight: 1000,
    findings: [
      { value: '−77%', count: 77, prefix: '−', suffix: '%', label: 'drafting time per converted drawing set' },
      { value: '±2mm', label: 'dimensional tolerance enforced before hand-off' },
      { value: '9/week', count: 9, suffix: '/week', label: 'drawing sets processed, against two by hand' },
    ],
    impact: {
      value: {
        value: '€32k',
        count: 32,
        prefix: '€',
        suffix: 'k',
        label: 'Annualised drafting cost returned',
        note: '17 hours a week at a conservative €40/hour loaded technical rate.',
      },
      time: {
        value: '17h',
        count: 17,
        suffix: 'h',
        label: 'Drafting hours returned each week',
        note: '11 hours per drawing set at baseline, 2.5 by week eight.',
      },
      effort: {
        value: '8 weeks',
        label: 'Effort to build',
        note: 'Cork AI Consulting — discovery, pipeline build, tolerance validation and drafter handover.',
      },
      quality: {
        value: '±2mm',
        label: 'Dimensional tolerance',
        note: 'Anything outside tolerance is flagged for a human rather than exported. A wrong dimension is worse than no dimension.',
      },
    },
    beforeAfter: [
      { metric: 'Hours to convert one drawing set', before: 11, after: 2.5, unit: 'hours', better: 'lower' },
      { metric: 'Dimensional rework passes per set', before: 3, after: 0.4, unit: 'passes', better: 'lower' },
      { metric: 'Drawing sets processed per week', before: 2, after: 9, unit: 'sets', better: 'higher' },
    ],
    illustrative: true,
    stack: ['Python (OpenCV, NumPy, Shapely)', 'PyTorch', 'FastAPI', 'DWG/DXF export', 'PostgreSQL'],
    role: 'Cork AI Consulting — founder & lead consultant, sole delivery',
    duration: '8 weeks',
    problem: [
      'Every survey sketch and every scanned legacy plan was redrawn in CAD by hand. A set took most of a working day, the practice had a backlog measured in months, and the work was skilled-but-mechanical — exactly the kind of task that burns senior time without developing anyone.',
      'The obvious automation had been tried and abandoned. Off-the-shelf raster-to-vector tools produced geometry that looked right and measured wrong, which is the worst possible failure mode here: a drafter cannot trust any of it, so they check all of it, and checking takes as long as redrawing.',
    ],
    approach: [
      {
        title: 'Started from the tolerance, not the model',
        body:
          'Before any modelling, I established what accuracy the practice actually needed a conversion to hit before a drafter would trust it, and what happens to a set that misses. Everything downstream is built to that number rather than to a generic accuracy score.',
      },
      {
        title: 'Geometry extraction in stages',
        body:
          'Line and arc detection, then wall and opening inference, then a topology pass that closes rooms. Each stage emits its own confidence, so a failure is attributable to a stage rather than to the pipeline as a whole.',
      },
      {
        title: 'Dimension validation as a hard gate',
        body:
          'Extracted dimensions are checked against annotated values and scale references on the source drawing. Anything outside tolerance stops and routes to a human with the discrepancy highlighted. The pipeline is allowed to decline.',
      },
      {
        title: 'Exported into the tools already in use',
        body:
          'Output lands as layered DWG/DXF matching the practice’s own layer conventions, so a converted set opens looking like their work rather than an import that has to be tidied before it can be edited.',
      },
    ],
    results: [
      'Conversion time per drawing set fell from around 11 hours to 2.5, and throughput rose from two sets a week to nine.',
      'Rework passes per set dropped from three to under one, because out-of-tolerance geometry never reaches a drafter in the first place.',
      'The months-long backlog of legacy plans cleared inside the engagement.',
      'Senior drafting time moved from redrawing to design review — the outcome the practice actually wanted.',
    ],
    chart: {
      title: 'Hours to convert one drawing set',
      unit: 'hours',
      series: [
        { label: 'Baseline', value: 11 },
        { label: 'Wk 2', value: 9.5 },
        { label: 'Wk 3', value: 7.8 },
        { label: 'Wk 4', value: 6.1 },
        { label: 'Wk 5', value: 4.6 },
        { label: 'Wk 6', value: 3.4 },
        { label: 'Wk 7', value: 2.8 },
        { label: 'Wk 8', value: 2.5 },
      ],
    },
    gallery: [
      {
        src: '/images/gallery/drawing-to-cad-automation-1.png',
        alt: 'Source drawing and extracted geometry side by side, with dimension checks annotated against the source values',
        caption: 'Source against extraction, with every dimension check annotated. The overlay is the review surface — a drafter accepts or rejects per dimension, not per drawing.',
        width: 1400,
        height: 800,
      },
      {
        src: '/images/gallery/drawing-to-cad-automation-2.png',
        alt: 'Queue of converted sets showing per-stage confidence and the items held back for human review',
        caption: 'The conversion queue. Held-back sets carry the stage that failed and why, so the fix is a known change rather than a retry.',
        width: 1400,
        height: 800,
      },
    ],
    faq: [
      {
        q: 'Why not just use an off-the-shelf raster-to-vector converter?',
        a: 'Because they optimise for a plausible-looking trace, and this trade needs a correct measurement. A converter with no notion of tolerance and no ability to decline produces output that has to be fully re-checked, which removes the entire saving.',
      },
      {
        q: 'What happens on a drawing the pipeline cannot read?',
        a: 'It stops and says so, with the failing stage named. The practice keeps a manual path for those, and they are a small and shrinking share. Declining is a feature; a confident wrong answer would end the engagement.',
      },
      {
        q: 'Does this replace a drafter?',
        a: 'No — it removes the mechanical half of the job. Every converted set is still reviewed and signed off by a person, and their time goes to the parts that need judgement.',
      },
    ],
    links: [
      { label: 'Read the case study', href: '/work/drawing-to-cad-automation/', external: false },
    ],
    featured: false,
    tone: 'dark-3',
    reverse: false,
  },

  // ---------------------------------------------------------------- 04
  {
    slug: 'ocean-drones',
    title: 'Ocean Drones — Autonomous Marine Data Platform',
    eyebrow: 'PYTHON · ML',
    org: 'FIAP',
    brand: { wordmark: 'DriftWatch', accent: '#0ea5a5', accent2: '#5fd0c9' },
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
    impact: {
      value: {
        value: 'No lab trips',
        label: 'Value returned',
        note: 'A crewed sampling run and its lab round-trip replaced by an autonomous mission and a live readout.',
      },
      time: {
        value: 'Same day',
        label: 'Survey turnaround',
        note: 'From weeks waiting on lab results to a health readout available during the mission itself.',
      },
      effort: {
        value: '2 semesters',
        label: 'Effort to build',
        note: 'Team of four. I owned the ingestion pipeline and both machine-learning models.',
      },
      quality: {
        value: '91%',
        count: 91,
        suffix: '%',
        label: 'Top-1 classification accuracy',
        note: 'On the held-out validation set, up from a 64% untuned baseline.',
      },
    },
    beforeAfter: [
      { metric: 'Species classification top-1 accuracy', before: 64, after: 91, unit: '%', better: 'higher' },
      { metric: 'Days to a usable survey result', before: 14, after: 0, unit: 'days', better: 'lower' },
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
        src: '/images/gallery/ocean-drones-1.png',
        alt: 'Telemetry view plotting pH and temperature against the seasonal baseline for one survey area',
        caption: 'Telemetry against the seasonal baseline — divergence is the thing worth looking at, so it is what the chart encodes.',
        width: 1400,
        height: 800,
      },
      {
        src: '/images/gallery/ocean-drones-2.png',
        alt: 'Classification review queue showing captured frames with candidate species and confidence scores',
        caption: 'The review queue. Low-confidence frames go to a human rather than being reported as identified.',
        width: 1400,
        height: 800,
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
      { label: 'Read the case study', href: '/work/ocean-drones/', external: false },
    ],
    // Unfeatured when the Cork AI consultancy work joined the home strip: the
    // featured three are the AI/data/automation positioning, and an academic
    // final-year project is the weakest of the four for that job. Still fully
    // present on /work, and still in POPULAR_SLUGS for the 404.
    featured: false,
    tone: 'dark-3',
    reverse: false,
  },

];

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export const featured: Project[] = projects.filter((p) => p.featured);

/**
 * What to offer someone who has landed on a 404.
 *
 * Deliberately its own list rather than reusing `featured`. The 404 used to map
 * `featured`, which silently coupled "what we show on the home page" to "where
 * we send a lost visitor" — so changing the featured flag quietly changed the
 * 404, and for a while that meant the 404 recommended invented case studies.
 */
const POPULAR_SLUGS = ['ai-opportunity-assessment', 'customer-approval-agent', 'vinted-tracker'] as const;

export const popular: Project[] = POPULAR_SLUGS.map((slug) => {
  const found = projects.find((p) => p.slug === slug);
  // Fail loudly at build time rather than rendering a 404 page with holes in it.
  if (!found) throw new Error(`popular: no project with slug "${slug}"`);
  return found;
});

export function projectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/**
 * The lossless WebP twin of a project cover, for a <picture> source.
 *
 * tools/gen_dashboards.py writes `<slug>.png` and `<slug>.webp` side by side,
 * so this is a pure path swap rather than a second field to keep in sync.
 * Returns null for anything that is not one of those PNGs, so a cover set to an
 * SVG or an external URL degrades to a plain <img> instead of pointing at a
 * .webp that was never generated.
 */
export function coverWebp(cover: string): string | null {
  return cover.startsWith('/images/dash/') && cover.endsWith('.png')
    ? cover.replace(/\.png$/, '.webp')
    : null;
}

const TOOL_LABELS: Record<ToolKey, string> = {
  tableau: 'Tableau',
  powerbi: 'Power BI',
  python: 'Python',
  sql: 'SQL',
  excel: 'Excel',
  ml: 'AI & ML',
  automation: 'Automation',
  cloud: 'Cloud',
};

// AI and automation lead, because that is the positioning: the tool chips
// are the first thing a visitor reads about what the work IS.
const TOOL_ORDER: ToolKey[] = ['ml', 'automation', 'cloud', 'python', 'sql', 'powerbi', 'tableau', 'excel'];

export const toolFilters: { key: ToolKey | 'all'; label: string; count: number }[] = [
  { key: 'all', label: 'All', count: projects.length },
  ...TOOL_ORDER.map((key) => ({
    key,
    label: TOOL_LABELS[key],
    count: projects.filter((p) => p.tags.includes(key)).length,
  })).filter((f) => f.count > 0),
];
