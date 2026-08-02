import type { APIRoute } from 'astro';
import { projects } from '../data/projects';

/**
 * sitemap.xml, generated at build time.
 *
 * Hand-rolled rather than pulling in @astrojs/sitemap: the route list is short
 * and fully known here, and the site ships with zero dependencies beyond astro.
 * Static routes carry a priority; case studies are derived from the data, so
 * adding a project adds its sitemap entry automatically.
 */
const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'monthly' },
  { path: '/work/', priority: '0.9', changefreq: 'monthly' },
  { path: '/playground/', priority: '0.8', changefreq: 'monthly' },
  { path: '/services/', priority: '0.8', changefreq: 'monthly' },
  { path: '/ai-services/', priority: '0.8', changefreq: 'monthly' },
  { path: '/meetup/', priority: '0.6', changefreq: 'monthly' },
  { path: '/privacy/', priority: '0.3', changefreq: 'yearly' },
];

export const GET: APIRoute = ({ site }) => {
  // Without `site` set there is no absolute URL to advertise, so emit an empty
  // (but valid) sitemap rather than a document full of broken relative links.
  const base = site?.href.replace(/\/$/, '') ?? '';

  const urls = [
    ...STATIC_ROUTES,
    ...projects.map((p) => ({
      path: `/work/${p.slug}/`,
      priority: '0.7',
      changefreq: 'yearly',
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${base}${u.path}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
