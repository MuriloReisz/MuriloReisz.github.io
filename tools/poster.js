#!/usr/bin/env node
// Regenerate the intro posters from the live scene.
//
// public/images/itm-poster.webp (2400x1000, desktop) and itm-poster-m.webp
// (390:844 crop around the figure @1.7x, phones) are headless renders of
// src/scripts/pointcloud.ts at scroll 0. They are what paints before Three.js
// loads, and the ONLY thing phones see — so whenever the scene, camera, shift
// or shader changes, run this again or the poster and the canvas will no
// longer line up through the crossfade.
//
//   npm run build && npx astro preview --port 4321 &
//   npm i --no-save --no-audit --no-fund playwright   # never saved: lockfile rule
//   node tools/poster.js                              # writes to public/images/
//
// Needs the SwiftShader flags for WebGL in headless Chromium. Waits for the
// sway's first zero crossing (pi / SWAY_SPEED seconds after first paint) so
// the poster is the exact frame the live canvas fades in on. WebP is encoded
// by Chromium's own canvas, so there is no image dependency.
import { chromium } from 'playwright';
import fs from 'node:fs';
const B = process.env.BASE || 'http://localhost:4321';
const OUT = new URL('../public/images/', import.meta.url).pathname;
const Q = +(process.env.Q || 0.62);
const HIDE = `.itm-id,.itm-hud,.itm-hint,.itm-skip,.itm-scrim,.itm-scanline,.itm-poster,.navbar,.consent,.itm-veil{display:none!important}
.itm-canvas{transition:none!important} html{scroll-behavior:auto!important}`;

async function encodeWebp(ctx, pngPath, q) {
  const pg = await ctx.newPage();
  const b64 = fs.readFileSync(pngPath).toString('base64');
  const out = await pg.evaluate(async ([b64, q]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', q);
  }, [b64, q]);
  await pg.close();
  return Buffer.from(out.split(',')[1], 'base64');
}

async function render(b, w, h, dpr, clip, name) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, colorScheme: 'light' });
  const pg = await ctx.newPage();
  const logs = [];
  pg.on('pageerror', e => logs.push('PAGEERR ' + e.message));
  await pg.goto(B + '/', { waitUntil: 'networkidle' });
  await pg.addStyleTag({ content: HIDE });
  await pg.waitForSelector('.itm-canvas.is-ready', { timeout: 60000 });
  // Wait for the sway's first zero crossing after the reveal: ts = pi / 0.17 s after FCP.
  const target = Math.PI / 0.17 * 1000;
  const info = await pg.evaluate(() => ({ fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime, now: performance.now() }));
  const wait = target - (info.now - info.fcp);
  console.log(name, 'fcp', Math.round(info.fcp), 'ready at', Math.round(info.now), 'waiting', Math.round(wait));
  if (wait > 0) await pg.waitForTimeout(wait);
  const png = `/tmp/${name}.png`;
  await pg.screenshot({ path: png, clip });
  const webp = await encodeWebp(ctx, png, Q);
  fs.writeFileSync(`${OUT}/${name}.webp`, webp);
  console.log(name, 'png', Math.round(fs.statSync(png).size / 1024) + 'KB', 'webp', Math.round(webp.length / 1024) + 'KB', logs);
  await ctx.close();
}

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const W = 2400, H = 1000;
  await render(b, W, H, 1, undefined, 'itm-poster');
  // Figure centre after the shift lens: 0.5*W + 0.19*H. Mobile crop keeps the 390:844 aspect.
  const cw = Math.round(H * 390 / 844);
  const cx = Math.round(W / 2 + 0.19 * H - cw / 2);
  await render(b, W, H, 1.7, { x: cx, y: 0, width: cw, height: H }, 'itm-poster-m');
  await b.close();
})();
