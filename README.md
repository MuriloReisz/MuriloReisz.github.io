# Murilo Reis — Portfolio & Business Site

A framework-free **Astro 4** static site: a data-analyst portfolio and a consulting
business site in one, with an Apple-inspired design language, full light/dark theming,
and a hand-rolled interaction layer (no React, no GSAP, no chart library).

## Run it locally

```bash
npm install
npm run dev      # http://localhost:4321
```

Build for production:

```bash
npm run build    # static output in ./dist
npm run preview  # serve the production build
```

> The sandbox this was built in blocks listening sockets, so `npm run dev` can't run
> there — everything is verified with `npm run build`. Preview locally.

## Routes

| Route | What it is |
|---|---|
| `/` | Home: hero, about, featured work, stats, skills, tech, activity, testimonials, experience, education, contact |
| `/work` | Portfolio browser — live search, tool filters, sort, grid/list toggle |
| `/work/[slug]` | One case-study reader per project, generated from data |
| `/playground` | Hands-on interactive demos (ROI calculator, SQL console, forecast, churn scorer, ETL pipeline, KPI explorer) |
| `/services` | Analytics services — diagnostic, build, retainer |
| `/ai-services` | AI services — assessment, implementation, ongoing support |
| `/meetup` | The free monthly local AI meetup |

## Architecture

```
src/
  data/
    site.ts          ← identity: name, role, contact, socials, nav. Edit this first.
    projects.ts      ← the portfolio. One object per project drives the home tile,
                       the /work card, and the whole /work/<slug> case study.
    extras.ts        ← testimonials, skills, certs, stats, tech stack, activity grid
  layouts/Layout.astro  <head>, SEO + Open Graph, JSON-LD, theme bootstrap, shell
  components/        Nav, Footer, Chrome (consent · ⌘K · lightbox · back-to-top),
                     WorkTile, ProjectCard, StatBand, SkillsPanel, TechMarquee,
                     ActivityHeatmap, Testimonials
  pages/             one .astro per route ([slug].astro is generated from projects.ts)
  scripts/
    site.ts          base interactions: theme, reveal, nav, ⌘K, filters, FAQ, carousels
    motion.ts        scroll-animation engine (parallax, word reveal, counters, marquee,
                     sticky stacks, tilt, magnetic buttons, scroll-spy, progress rings)
    interactive.ts   the interactive widgets (charts, calculators, SQL console, lightbox)
  styles/
    global.css       the design system — tokens, tiles, type scale, components
    motion.css       .mo-*  animation primitives
    ix.css           .ix-*  shared widget primitives (sliders, charts, tooltips)
    work.css         .pc-* /work grid · .cse-* case-study reader
    playground.css   .pg-*  demo shells
    home.css         .hm-*  new home sections
public/images/       SVG figures, dashboard shots, logos, portrait
```

### Adding a project

Append one object to `projects` in `src/data/projects.ts`. Everything else is automatic:
the `/work` card and its filter tags, the `/work/<slug>` case study, the ⌘K search entry,
and — if you set `featured: true` — a full-bleed tile on the home page.

### Design rules worth knowing before you edit CSS

- Colours come from CSS custom properties only (`--color-ink`, `--color-primary`, …).
  Dark mode is `[data-theme="dark"]` on `<html>`; use tokens and it just works.
- Sections are `.tile` + a tone variant, alternating down the page, with content in
  `.inner`. Headlines are `.metrics__h2`, labels are `.eyebrow`, buttons are `.pill`.
- `--product-shadow` is the only shadow in the system, and only on product renders.
  Everywhere else, separation comes from a 1px `--color-hairline` border.
- Every animation has a `prefers-reduced-motion: reduce` escape hatch. Keep it that way.

## Integrations

- **Contact forms** post to [FormSubmit](https://formsubmit.co) →
  `muriloarielreisz@gmail.com`. FormSubmit needs a one-time email confirmation on the
  very first submission before it starts forwarding.
- **Booking** — set `calendlyUrl` in `site.ts` and every "book a call" button uses it.
- **AI Advisor** — set `advisorUrl` in `site.ts` to point the floating button somewhere.
- **Analytics** — none is bundled. The cookie banner is already wired to gate it; add
  your snippet in `Layout.astro` behind the stored `consent` value.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to **GitHub Pages** on every push
to `main`. Enable it once under *Settings → Pages → Source → GitHub Actions*.

This repo is named `MuriloReisz.github.io`, so the site serves from the domain root at
<https://muriloreisz.github.io> and needs no `base` in `astro.config.mjs`.

To move to a custom domain later: set `site` in `astro.config.mjs` to the new domain, add
`public/CNAME` containing the bare hostname, and point the DNS at GitHub Pages.

It also deploys anywhere else static — Netlify, Vercel or Cloudflare Pages — with build
command `npm run build` and output directory `dist`.

## Content note

The portfolio in `src/data/projects.ts` mixes real delivered work (the Apple CEMEA
dashboard, the freelance automation practice, the FIAP Ocean Drones project) with
additional projects written to fill out the site. Swap the latter for real engagements
before using this as a live CV, and keep the metrics honest — they are the first thing
a technical reader will probe.
