// ============================================================
//  SITE IDENTITY — ⬅️  EDIT THIS FILE to make the site yours.
//  Everything shared across pages (name, brand, links, nav)
//  lives here. Section body-copy lives in each component.
// ============================================================

export const site = {
  brand: 'Murilo Reis',                 // company / personal brand (updated below via logo choice)
  name: 'Murilo Reis',                  // your full name
  role: 'Data Analyst · AI Specialist', // headline role
  location: 'Cork City, Ireland',
  tagline:
    'Dashboards, machine-learning models, and data pipelines that turn raw data into decisions leaders can act on.',

  email: 'muriloarielreis@gmail.com',
  phone: '+353 87 384 1528',

  socials: {
    github: 'https://github.com/MuriloReisz',
    linkedin: 'https://www.linkedin.com/in/murilo-reis-data/',
  },

  // CV / résumé download (served from /public)
  resume: '/Murilo-Reis-CV.docx',

  // Optional booking + chat integrations (leave blank to hide)
  calendlyUrl: '', // e.g. 'https://calendly.com/you/intro'
  advisorUrl: '',  // e.g. a custom GPT / chatbot link for the "Ask the AI Advisor" button

  year: 2026,
} as const;

// Primary navigation ("Services" mega-menu targets each real route).
export const nav = {
  aboutMenu: [
    { label: 'Portfolio', href: '/work' },
    { label: 'Experience', href: '/#experience' },
    { label: 'Certifications & Achievements', href: '/#achievements' },
    { label: 'Playground', href: '/playground' },
  ],
  servicesMenu: [
    { label: 'AI services', href: '/ai-services', desc: 'Find 5+ hours a week or your money back, fee credited to a build' },
    { label: 'Analytics services', href: '/services', desc: 'Dashboards, forecasts and automation you can trust' },
    { label: 'Meetup', href: '/meetup', desc: 'A free monthly AI meetup for local businesses' },
  ],
  mobile: [
    { label: 'About me', href: '/#about' },
    { label: 'Portfolio', href: '/work' },
    { label: 'Playground', href: '/playground' },
    { label: 'Experience', href: '/#experience' },
    { label: 'AI services', href: '/ai-services' },
    { label: 'Analytics services', href: '/services' },
    { label: 'Meetup', href: '/meetup' },
  ],
};
