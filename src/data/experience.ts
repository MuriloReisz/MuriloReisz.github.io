// ============================================================
//  EXPERIENCE — the single source for the home page timeline
//  and /cv. Mirrors the October 2026 CV word for word on dates
//  and titles; edit here and both pages follow.
// ============================================================

export interface Role {
  role: string;
  org: string;
  dates: string;
  place: string;
  logo?: string;
  /** Optional one-paragraph framing above the bullets (HTML allowed). */
  intro?: string;
  tools?: string;
  /** Bullets; inline <strong> allowed. */
  points: string[];
  tags: string[];
}

export const experience: Role[] = [
  {
    role: 'Co-Founder &amp; Data / AI Consultant',
    org: 'Cork AI Consulting',
    dates: 'Sep 2026 — Present',
    place: 'Cork, Ireland',
    logo: '/images/logo-icon.png',
    intro:
      'AI, data and automation for small and mid-sized Irish businesses, co-founded with Douglas Woollam. Every engagement is scoped around a <strong>measurable outcome</strong> — hours returned or cost avoided — and run end to end: discovery, build, validation, handover.',
    tools: 'Claude Code · Codex CLI · Claude API · MCP · Python · SQL · JavaScript/Node · Swift · Playwright · n8n · Tableau · Power BI · GCP · Vercel · Notion',
    points: [
      'Built the delivery engine for the <strong>AI Opportunity Assessment</strong>: an agent that turns a discovery-call transcript into a client-branded, ROI-backed report, with an honesty gate that blocks any claim the client didn’t support. Delivered to the first client before launch.',
      'Built a <strong>guardrailed Instagram DM assistant</strong> on Meta’s Messenger Platform that answers customer enquiries 24/7 within strict rules, so it never gives a made-up answer.',
      'Designed and launched the company’s <strong>products showcase and site experience</strong>, including a live interactive demo of BlarneyKey, our free, private, offline AI dictation app for macOS — co-built and shipped with Whisper running on the Apple Neural Engine.',
      'Turned <strong>28 standalone AI workflows</strong> into a shared, version-controlled skills library, so both founders run the same automations for research, content, transcripts and client delivery from one Git repository.',
      'Built a <strong>self-maintaining knowledge base</strong> that keeps the Git repository and the Notion workspace in sync automatically — one source of truth for decisions, next actions and client history.',
      'Engineered the <strong>outreach tooling with safety at its core</strong>: approval-gated sending, account-protection rules and recovery plans that keep every customer-facing message under human control.',
      'Bring enterprise-scale analytics experience to small and medium businesses, starting every engagement with the <strong>AOA framework</strong> (Audit, Optimise, Automate).',
    ],
    tags: ['Co-founder', 'AI agents', 'Outcome-scoped', 'Cork, Ireland'],
  },
  {
    role: 'Data Analyst, EMEIA Sales BPR &amp; Systems',
    org: 'Apple',
    dates: 'Nov 2025 — Oct 2026',
    place: 'Cork, Ireland (Hybrid)',
    intro: 'Apple’s EMEIA Sales Business Process Re-engineering &amp; Systems team, working across data engineering, analytics and automation.',
    tools: 'Python (Pandas, Playwright, Selenium) · SQL · Snowflake · Spark · Azure · Tableau · Claude Code · Excel',
    points: [
      'Built pipelines, automations and dashboards that Account Executives and senior leadership used to run and track <strong>multi-billion-dollar sales programmes</strong> across EMEIA.',
      'Co-built an automated <strong>Python, Playwright, Snowflake and Claude Code agent pipeline</strong> that approves or rejects customers against programme business rules, eliminating hours of daily manual review and sharply reducing false rejections.',
      'Developed Playwright browser-automation workflows replacing manual data collection, validation and reporting for the team.',
      'Built <strong>Tableau dashboards on live Snowflake data</strong>, giving programme leadership visibility of sales performance, KPIs and underperforming regions.',
      'Built predictive scripts and statistical models on programme sales data to support forecasting and targeted outreach to historical customers.',
      'Supported sales business process re-engineering across regions by managing large-scale datasets and enforcing data accuracy and integrity in every report the team shipped.',
    ],
    tags: ['EMEIA Sales', 'Agent pipeline', 'Snowflake · Tableau'],
  },
  {
    role: 'Freelance Data &amp; Automation Engineer',
    org: 'Independent',
    dates: 'Oct 2024 — Sep 2026',
    place: 'Remote',
    logo: '/images/logo-icon.png',
    intro: 'Data and automation projects for multiple clients, from first consultation to deployed solution. Continued as Cork AI Consulting from September 2026.',
    tools: 'Python (Pandas, Playwright, Selenium) · SQL · Spark · BigQuery · Azure · RPA (UiPath, PyAutoGUI) · n8n · Zapier · Power BI · Git',
    points: [
      '<strong>Reduced manual effort by up to 80%</strong> for client teams with custom Python and RPA automation, turning hours of multi-system handling into unattended scheduled runs.',
      'Managed the full lifecycle for several concurrent clients, from consultation to deployed data and automation solutions, with documented handovers in Git/GitHub/GitLab.',
      'Ran exploratory analysis and statistical modelling to define KPIs, surface trends and forecast performance.',
    ],
    tags: ['−80% manual effort', 'Python · RPA', 'End-to-end delivery'],
  },
  {
    role: 'Data Analyst',
    org: 'Porto',
    dates: 'Nov 2022 — Oct 2024',
    place: 'São Paulo, Brazil',
    logo: '/images/logos/porto.png',
    intro: 'Management Information area of Porto, one of Brazil’s largest insurance groups: the data pipelines, automations and dashboards behind the area’s daily reporting.',
    tools: 'Python (Pandas, NumPy, Selenium, BeautifulSoup, PyAutoGUI) · SQL · Google BigQuery · GCP · Looker Studio · AppSheet · Google Apps Script · n8n · Excel',
    points: [
      'Engineered and maintained scalable <strong>ETL pipelines moving terabytes</strong> of data from CSV, Excel, TXT and legacy sources into <strong>Google BigQuery</strong>, enforcing integrity and governance.',
      'Optimised warehouse performance with complex SQL and stored procedures, cutting query times on heavy analytical workloads.',
      'Built <strong>RPA processes</strong> with Selenium and PyAutoGUI to extract data from legacy systems with no direct database access, and web-scraping tools with Beautiful Soup for sites with no export option.',
      'Created <strong>Looker Studio dashboards</strong> of daily KPIs for analysts, managers and directors, translating stakeholder requirements into technical solutions.',
      'Drove process improvement with AppSheet apps, <strong>n8n AI workflows</strong> and Google Apps Script automations such as scheduled daily reports.',
    ],
    tags: ['Terabytes → BigQuery', 'ETL · SQL', 'n8n · AppSheet'],
  },
  {
    role: 'IT Assistant',
    org: 'Marcelo Tostes Advogados',
    dates: 'Dec 2021 — May 2022',
    place: 'São Paulo, Brazil',
    logo: '/images/logos/marcelo-tostes.png',
    intro: 'First point of contact for IT in a busy law firm, and the first hands-on role with data and automation.',
    tools: 'Excel · VBA · Python · Microsoft Office · Windows · networking',
    points: [
      'Handled hardware, software and network issues for lawyers and staff, keeping systems updated, stable and secure.',
      'Built Excel spreadsheets and reports for the office and ran data analysis to support the team’s day-to-day decisions.',
      'Wrote small automation scripts and macros in <strong>VBA and Python</strong> that removed repetitive manual tasks, and trained staff on the tools they used daily.',
    ],
    tags: ['IT support', 'Systems &amp; networks'],
  },
];

export const education = {
  name: 'Bachelor’s — Analysis &amp; Development of Systems',
  meta: 'FIAP · São Paulo · 2022–2024',
  note: 'Final-year project <a href="/work/ocean-drones/">Ocean Drones</a>: a full-stack platform for autonomous underwater drones with real-time sensor ingestion and scikit-learn / TensorFlow models.',
};

export const languages = 'Portuguese (native) · English C2 · Spanish C1 · French B2 · Italian B2';
