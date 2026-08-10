// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Custom domain (public/CNAME holds the bare host GitHub Pages reads).
  site: 'https://muriloreisz.com',

  // Emit /work/index.html rather than /work.html, so every URL in the nav
  // resolves on GitHub Pages without a redirect.
  build: { format: 'directory' },

  // Multi-page static site. No client framework needed — light JS via <script>.

  // Three.js (the "into the machine" point-cloud intro) is the first bare npm
  // import any client script has used. Listing it here means Vite's dev-mode
  // dependency crawler doesn't need to discover it by scanning every page —
  // that scan is what throws the one-time "Failed to scan for dependencies /
  // Unexpected ','" warning on a cold `astro dev` start. Harmless (the dev
  // server recovers and serves normally right after), but this removes it.
  vite: {
    optimizeDeps: { include: ['three'] },
  },
});
