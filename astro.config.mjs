// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Served from the MuriloReisz.github.io repo, so the site sits at the domain
  // root and needs no `base`. Moving to a custom domain later means changing
  // this line and adding a public/CNAME file holding the bare domain.
  site: 'https://muriloreisz.github.io',

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
