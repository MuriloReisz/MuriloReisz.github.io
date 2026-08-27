// ============================================================
//  SITE IDENTITY — ⬅️  EDIT THIS FILE to make the site yours.
//  Everything shared across pages (name, brand, links, nav)
//  lives here. Section body-copy lives in each component.
// ============================================================

export const site = {
  brand: 'Murilo Reis',                 // company / personal brand (updated below via logo choice)
  name: 'Murilo Reis',                  // your full name
  role: 'Data & AI Specialist',         // headline role
  location: 'Cork City, Ireland',
  tagline:
    'Dashboards, machine-learning models, and data pipelines that turn raw data into decisions leaders can act on.',

  email: 'muriloarielreisz@gmail.com',
  phone: '+353 87 384 1528',

  socials: {
    github: 'https://github.com/MuriloReisz',
    linkedin: 'https://www.linkedin.com/in/murilo-reis-data/',
  },

  // CV / résumé download (served from /public)
  resume: '/Murilo-Reis-CV.docx',

  // Optional booking + chat integrations (leave blank to hide)
  //
  // bookingUrl lights up every "Book a call" CTA on the site at once — the two
  // service pages, the meetup RSVP and the hero. Any of these work:
  //   'https://cal.com/murilo/discovery'   (Cal.com — free tier is plenty)
  //   'https://calendly.com/you/intro'     (Calendly — identical behaviour)
  //   'mailto:you@example.com'             (stopgap; gets a subject line added)
  // Leave it '' and every CTA falls back to that page's own contact anchor, so
  // nothing breaks — the buttons just scroll instead of booking.
  // Murilo's own Cal.com discovery-call event, created for this site so portfolio
  // enquiries stay separate from the Cork AI Consulting outreach funnel
  // (calendly.com/corkaiconsulting/30min, which is wired into the cold-email
  // signature instead). Deliberately not cal.com/douglas-woollam/* — those are
  // Douglas's, and offer.md records that only he can change them.
  //
  // The utm_source is what lets Cal.com's reporting separate a booking that came
  // from this site from one that came out of an email; without it they are
  // indistinguishable.
  bookingUrl: 'https://cal.com/murilo-reis-bzl0er/discoverycall?utm_source=website&utm_medium=cta&utm_campaign=muriloreisz-com',
  advisorUrl: '',  // e.g. a custom GPT / chatbot link for the "Ask the AI Advisor" button

  /** Last review date for the privacy copy — used by /privacy and the
      short version in the legal modal, so the two cannot drift apart. */
  privacyUpdated: '27 August 2026',

  year: 2026,
} as const;

/** A resolved booking link: where it goes, plus the anchor attrs it needs. */
export type BookingLink = { href: string; attrs: Record<string, string> };

/**
 * Resolve the booking CTA for one page.
 *
 * Each page passes its own on-page fallback so the "no account yet" behaviour
 * is preserved exactly — `#services-book`, `#ai-services-book`, `/#contact`.
 * Callers must spread `attrs`, which is what opens a real scheduler in a new
 * tab; a mailto: deliberately gets no `target` (opening a mail client in a new
 * browser tab leaves the visitor on a blank page).
 */
export function bookingFor(fallbackAnchor: string): BookingLink {
  const url: string = site.bookingUrl.trim();
  if (!url) return { href: fallbackAnchor, attrs: {} };
  if (url.startsWith('mailto:')) {
    const href = url.includes('?') ? url : `${url}?subject=${encodeURIComponent('Discovery call')}`;
    return { href, attrs: {} };
  }
  return { href: url, attrs: { target: '_blank', rel: 'noopener' } };
}

// Primary navigation ("Services" mega-menu targets each real route).
// /meetup is intentionally not listed: the page still builds and is reachable
// by URL, but it announces an event with no date yet. Re-add it with the date.
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
  ],
  mobile: [
    { label: 'About me', href: '/#about' },
    { label: 'Portfolio', href: '/work' },
    { label: 'Playground', href: '/playground' },
    { label: 'Experience', href: '/#experience' },
    { label: 'AI services', href: '/ai-services' },
    { label: 'Analytics services', href: '/services' },
  ],
};
