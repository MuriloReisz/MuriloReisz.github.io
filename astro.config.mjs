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
});
