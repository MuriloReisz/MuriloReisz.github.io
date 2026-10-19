// ============================================================
//  nameMorph.ts — the name assembles out of particles.
//
//  On a first desktop visit, before the HTML name rises in, ~30k points
//  scattered through the room converge into "MURILO REIS", hold, then
//  dissolve as the real text takes over underneath. The points are a
//  child of the CAMERA, so sway and pointer parallax never move the text
//  relative to the screen, and their targets are sampled from the actual
//  on-screen box of the HTML element — which is what makes the hand-off
//  from particles to type read as one object changing state.
//
//  The text raster comes from an offscreen 2D canvas drawn with the
//  element's own computed font, aligned by the font's bounding-box ascent
//  so the baseline matches the HTML line box, not just the centre.
//
//  Lifetime: build on the first rendered frame (the projection, with its
//  view offset, must be current), update per frame, dispose when done.
//  Skipped entirely in lite mode (never loaded) and under reduced motion.
// ============================================================
import * as THREE from 'three';

export type NameMorph = {
  /** Advance the animation. Returns false once it has finished and been removed. */
  update(now: number, pxPerUnit: number): boolean;
};

const VERT = /* glsl */ `
  uniform float uMorph;     // 0 scattered .. 1 assembled
  uniform float uDissolve;  // 0 .. 1 fading out
  uniform float uScale;     // px per world unit at unit depth
  attribute vec3 aStart;
  attribute float aSeed;
  varying float vE;
  varying float vAlpha;
  void main() {
    // Each point runs the same ease, staggered a little by its seed, so
    // the word closes up over a quarter second instead of snapping.
    float e = clamp((uMorph - aSeed * 0.22) / 0.78, 0.0, 1.0);
    e = 1.0 - pow(1.0 - e, 4.0);
    vec3 p = mix(aStart, position, e);
    // Dissolve: drift down and away, each point at its own pace.
    p += vec3(0.25 + aSeed * 0.3, -0.35 - aSeed * 0.4, -0.3) * uDissolve * uDissolve;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float depth = max(-mv.z, 0.02);
    float size = mix(0.0075, 0.0028, e);
    gl_PointSize = clamp(size * uScale / depth, 1.0, 7.0);
    vE = e;
    vAlpha = mix(0.35, 1.0, e) * (1.0 - smoothstep(0.0, 1.0, uDissolve - aSeed * 0.3));
  }
`;
const FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uColor;
  uniform vec3 uHot;
  varying float vE;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float soft = 1.0 - smoothstep(mix(0.0, 0.06, vE), 0.25, r2);
    vec3 c = mix(uColor, uHot, vE * 0.85);
    float a = soft * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(c, a);
  }
`;

/**
 * Sample the lit pixels of `text` drawn in `el`'s font, placed exactly over
 * `el`'s on-screen box, and return camera-local target positions at `depth`.
 */
function sampleTargets(
  camera: THREE.PerspectiveCamera, el: HTMLElement, text: string, count: number, depth: number
): Float32Array | null {
  const rect = el.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return null;
  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize);
  const lineH = parseFloat(cs.lineHeight) || fontSize * 0.96;
  const scale = Math.min(2, devicePixelRatio || 1);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(rect.width * scale);
  cv.height = Math.ceil(lineH * scale);
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
  // Chrome and Safari 17 honour this; elsewhere the raster is a hair wider.
  try { (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing; } catch {}
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  if (cs.textTransform === 'uppercase') text = text.toUpperCase();
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent ?? fontSize * 0.8;
  const desc = m.fontBoundingBoxDescent ?? fontSize * 0.2;
  // Where the browser puts the baseline inside a line box of this height.
  const baseline = (lineH - (asc + desc)) / 2 + asc;
  ctx.fillText(text, 0, baseline);

  const img = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const lit: number[] = [];
  for (let i = 3; i < img.length; i += 4) if (img[i] > 100) lit.push((i - 3) / 4);
  if (lit.length < 100) return null;

  camera.updateMatrixWorld();
  const inv = new THREE.Matrix4().copy(camera.matrixWorld).invert();
  const v = new THREE.Vector3();
  const out = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    const px = lit[(Math.random() * lit.length) | 0];
    const x = (px % cv.width) + Math.random();
    const y = Math.floor(px / cv.width) + Math.random();
    const sx = rect.left + x / scale;
    const sy = rect.top + y / scale;
    v.set((sx / innerWidth) * 2 - 1, 1 - (sy / innerHeight) * 2, 0.5).unproject(camera).applyMatrix4(inv);
    // A ray from the camera through that pixel, cut at `depth`.
    const t = -depth / v.z;
    out[k * 3] = v.x * t;
    out[k * 3 + 1] = v.y * t;
    out[k * 3 + 2] = -depth;
  }
  return out;
}

export function createNameMorph(
  scene: THREE.Scene, camera: THREE.PerspectiveCamera, el: HTMLElement, text: string,
  accent: string, startAt: number, count = 30000
): NameMorph | null {
  const targets = sampleTargets(camera, el, text, count, 1.6);
  if (!targets) return null;

  const starts = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Scattered through the whole view, deeper than the text plane, so the
    // word gathers out of the room rather than sliding in from one side.
    starts[i * 3] = (Math.random() * 2 - 1) * 2.2;
    starts[i * 3 + 1] = (Math.random() * 2 - 1) * 1.3;
    starts[i * 3 + 2] = -1.0 - Math.random() * 3.2;
    seeds[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(targets, 3));
  g.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const uniforms = {
    uMorph: { value: 0 },
    uDissolve: { value: 0 },
    uScale: { value: 600 },
    uColor: { value: new THREE.Color(accent) },
    uHot: { value: new THREE.Color('#f3efff') },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.NormalBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 2;
  // Children of the camera render in camera space: the text is pinned to
  // the screen whatever the sway or the parallax do.
  if (!camera.parent) scene.add(camera);
  camera.add(pts);

  const ASSEMBLE = 2200;
  const HOLD = 1000;
  const FADE = 800;
  let done = false;
  return {
    update(now, pxPerUnit) {
      if (done) return false;
      const t = now - startAt;
      uniforms.uScale.value = pxPerUnit;
      uniforms.uMorph.value = Math.min(1, Math.max(0, t / ASSEMBLE));
      uniforms.uDissolve.value = Math.min(1, Math.max(0, (t - ASSEMBLE - HOLD) / FADE));
      if (t >= ASSEMBLE + HOLD + FADE) {
        camera.remove(pts);
        g.dispose();
        mat.dispose();
        done = true;
        return false;
      }
      return true;
    },
  };
}
