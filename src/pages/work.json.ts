import type { APIRoute } from 'astro';
import { projects } from '../data/projects';

/**
 * work.json — a machine-readable index of the case studies.
 *
 * Exists so other surfaces can render the list without hand-copying it. The
 * GitHub profile README (MuriloReisz/MuriloReisz) builds a case-study card in a
 * nightly workflow and reads this; before it existed that card's numbers were
 * typed by hand and drifted — the profile advertised "9 written up" while this
 * data defined 11.
 *
 * Derived from `projects`, exactly like sitemap.xml.ts, so adding a project adds
 * its entry here automatically and there is nothing to keep in sync.
 *
 * `illustrative` is deliberately part of the contract. It marks an anonymised
 * composite scenario rather than a named client engagement, and the site renders
 * a visible badge for it. Any consumer showing these figures must be able to
 * make that same distinction, so it travels with the data rather than living
 * only in this repo's UI.
 */
interface WorkEntry {
  slug: string;
  title: string;
  eyebrow: string;
  year: number;
  featured: boolean;
  /** True when the figures are an anonymised composite, not a delivered result. */
  illustrative: boolean;
  url: string;
}

export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? '';

  const entries: WorkEntry[] = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    eyebrow: p.eyebrow,
    year: p.year,
    featured: p.featured,
    // Normalised to a real boolean: the field is optional in the source data,
    // and a consumer checking `illustrative === false` must not be defeated by
    // `undefined`.
    illustrative: p.illustrative === true,
    url: `${base}/work/${p.slug}/`,
  }));

  const body = JSON.stringify(
    {
      generated: new Date().toISOString(),
      count: entries.length,
      projects: entries,
    },
    null,
    2
  );

  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Public, cacheable, but short enough that a new case study appears on
      // the profile card within a day rather than whenever a CDN feels like it.
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
