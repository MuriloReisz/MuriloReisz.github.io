#!/usr/bin/env node
// Post-build: add a Content-Security-Policy <meta> to every page in dist/.
//
// GitHub Pages cannot send headers, so the policy has to live in the HTML.
// It is generated here rather than written by hand because it pins each
// page's inline <script> by SHA-256 — edit the theme bootstrap in
// Layout.astro and a hand-written hash would silently block it. Run after
// `astro build` (the npm build script does this).
//
// External origins allowed: Google Fonts (CSS + font files) and FormSubmit
// (form posts). Everything else the site loads is its own.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

// Executable inline scripts only: no src=, and not a JSON data block.
const INLINE = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/g;

let pages = 0;
for (const file of htmlFiles(DIST)) {
  let html = readFileSync(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  const hashes = [...html.matchAll(INLINE)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`
  );
  const policy = [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "form-action 'self' https://formsubmit.co",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
  const tags =
    `<meta http-equiv="Content-Security-Policy" content="${policy}">` +
    `<meta name="referrer" content="strict-origin-when-cross-origin">`;
  html = html.replace(/<meta charset="UTF-8"\s*\/?>/i, (m) => m + tags);
  writeFileSync(file, html);
  pages++;
}
console.log(`csp: policy added to ${pages} pages`);
