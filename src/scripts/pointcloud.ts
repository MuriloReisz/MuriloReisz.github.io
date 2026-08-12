// ============================================================
//  pointcloud.ts — the "into the machine" cold-open scene.
//
//  A procedural point cloud (no 3D scan file — a coded impression of a
//  person at a terminal) rendered with Three.js in two draw calls. It
//  sways slowly, tilts toward the cursor, and scrolling through
//  .itm-wrap dollies the camera into the monitor while a violet veil
//  fades in, so the visitor appears to fly through the screen and land
//  on the real hero underneath.
//
//  ---------- why it is built the way it is ----------
//
//  SURFACES, NOT VOLUMES. The single thing that makes a point cloud
//  read as a *scan* rather than as fog is that a real depth sensor
//  only ever sees surfaces — it cannot put a sample inside a solid
//  object. Every sampler below therefore emits onto a shell (plane,
//  ellipsoid surface, tube surface, lofted surface) and never fills an
//  interior. The first version of this file filled boxes and ellipsoids
//  volumetrically, which is exactly why it read as soft blobs.
//
//  THE FIGURE IS LOFTED, NOT ASSEMBLED. Torso and neck are ONE continuous
//  surface whose cross-section varies smoothly; each arm and leg is
//  another, and so is the hood. Built as separate primitives — an
//  ellipsoid head on an ellipsoid torso, tube arms with ball elbows — it
//  read as a doll, because every joint was a seam between two closed
//  shapes. Sections are superellipses, since a human trunk is a rounded
//  rectangle in section and circular sections look like balloons. The hood
//  is a loft for the same reason: as a single ellipsoid it was a helmet,
//  and no hole cut in a helmet looks like cloth.
//
//  THE FIGURE HAS NO FACE, AND THAT IS THE POINT. He wears the hood up,
//  and the opening is a real hole in the fabric with an opaque dark shell
//  behind it. Two earlier versions painted a face on: a Guy Fawkes mask,
//  then a corrected one. Both cost far more code than the hood and neither
//  survived a close look. Nothing above the neck is clothed in glyphs —
//  leave the skull rings clothed and their characters show through the
//  opening as a face made of code, which is the one read this exists to
//  avoid.
//
//  DENSITY IS THE DETAIL. 728k points on a desktop with more than four
//  cores, 470k on four or fewer, 237k on a phone — all three measured with
//  QUALITY pinned, not scaled from one reading, because the fixed-count
//  emitters (hood rows, terminal panels) do not shrink with it. That is
//  well past
//  the ~463k of the reference this was modelled on, and it costs nothing
//  over the network because it is generated at runtime rather than
//  downloaded as a multi-megabyte quantized mesh. Most of the growth is
//  the room: floor, walls, ceiling and background furniture are over half
//  the buffer, all of it dim and fogged.
//
//  TWO PASSES, ZERO PER-FRAME CPU. A solid pass that writes depth, and
//  a soft pass (haze, motes, swarm, starfield) that tests depth but
//  never writes it, so a dim mote can hide behind the desk without
//  punching a hole through the figure. All per-point life — shimmer,
//  sensor dropout, depth fog, the scan-in reveal, the orbiting swarm,
//  the data-stream pulses, the terminal-glyph flicker — happens in the
//  vertex shader off a per-point flag and two uniforms. Nothing walks
//  the position buffer per frame: at this count that loop alone would
//  cost more than the entire render.
//
//  ALPHA BLENDED, NOT ADDITIVE. Additive blending saturates to white
//  wherever points overlap, which at this density is most of the
//  figure. Alpha blending over black keeps the crisp grain and lets
//  depth fog actually darken distant geometry.
//
//  AUTHORED IN ROOM SPACE. Every coordinate below is real-world-ish
//  metres with the floor at y = 0, and the whole buffer is re-centred
//  once at the very end. Mixing centred and un-centred vectors was a
//  live bug in an earlier version (it put the camera behind the
//  chair), so the centring now happens in exactly one place.
//
//  Loaded only from IntoTheMachine.astro (component-scoped <script>),
//  so Three.js never ships on pages that don't render this section.
//  Bails out cleanly (leaving the CSS fallback visible) if WebGL is
//  unavailable or the visitor prefers reduced motion.
// ============================================================
import * as THREE from 'three';

const wrap = document.querySelector<HTMLElement>('.itm-wrap');
const canvas = document.querySelector<HTMLCanvasElement>('.itm-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// The bootstrap call lives at the very BOTTOM of this file, not here.
// boot() reads module-level constants (QUALITY, the size/brightness
// tables, the shader sources), so calling it above their declarations
// puts them in the temporal dead zone — which silently degrades to the
// static fallback panel instead of throwing anywhere visible.

// ============================================================
//  tuning
// ============================================================

type V3 = [number, number, number];

const TAU = Math.PI * 2;

// Quality scalar. Every point count below is multiplied by this, so
// the whole scene scales coherently instead of needing per-element
// mobile overrides. Measured: 0.34 -> 237k points, 0.75 -> 470k,
// 1.2 -> 728k.
const QUALITY = (() => {
  const coarse = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
  if (coarse) return 0.34;
  const cores = navigator.hardwareConcurrency || 4;
  return cores <= 4 ? 0.75 : 1.2;
})();

// Point sizes, in world units (metres). Kept small and varied — fine
// grain is what sells the scan.
const SZ = {
  fine: 0.0013, // dense read surfaces: desk top, screen, skin, fabric
  base: 0.0016, // general objects
  bold: 0.0022, // contours, keycap outlines, rims — the crisp bits
  glyph: 0.0055, // one fat dot per dot-matrix cell — see glyphLine
  glyphSm: 0.0072, // body code: sized to ~2/3 of its own cell pitch
  code: 0.0036, // one dot per code cell on a screen; ~0.7 of CODE.pitch
  dust: 0.0011, // ambient motes
};

// Brightness classes. Multiplied by a per-point jitter on emit, then
// used in the shader to pick colour between the base violet and a
// near-white "hot" tone.
const B = {
  bg: 0.42, // floor, backdrop — barely there
  mid: 0.7,
  obj: 0.95,
  skin: 1.1,
  edge: 1.32,
  screen: 1.5,
  dust: 0.5,
};

// Per-point behaviour codes, carried in the aFlag attribute. Everything
// animated happens in the vertex shader off one of these plus aParam,
// whose meaning depends on the flag — so half a million points cost two
// uniform writes a frame and nothing else.
//
// This replaces an earlier trick that smuggled the screen flag in as a
// negative brightness. That worked, but it does not extend to five
// behaviours, and a sign is invisible at the call site.
const FLAG = {
  none: 0,
  /** Monitor. aParam unused. Blooms as the camera closes in. */
  screen: 1,
  /** Swarm mote. aParam = angular speed (rad/s, signed). */
  orbit: 2,
  /** Data stream. aParam = normalised position along its path (0..1). */
  stream: 3,
  /** Terminal glyph. aParam = per-glyph id, so a whole character blinks together. */
  glyph: 4,
  /** Star or nebula. aParam unused. Exempt from depth fog. */
  sky: 5,
  /**
   * Scrolling code on a screen. aParam = the point's own normalised
   * height within its code block (0..1).
   *
   * That one float is all the shader needs, which is the reason it is
   * stored per DOT and not per character: the block's bottom edge is
   * recoverable as `y - aParam * H`, so a single uniform scrolls any
   * number of rows on any screen without carrying a band per point. Store
   * it per character instead and every glyph collapses onto its own
   * baseline, because all five of its dot rows would scroll to the same y.
   */
  code: 6,
};

// The scrolling code block. `h` is the world height of one screen's worth
// of rows and MUST be an exact multiple of the row pitch, or the wrap
// lands mid-row and the whole block visibly stutters once per cycle.
const CODE = {
  pitch: 0.0052, // per-dot cell pitch; a character is 4 of these wide
  rows: 8,
  speed: 0.055, // block-heights per second, upward, like a real terminal
  get lineH() {
    return this.pitch * 7;
  },
  get h() {
    return this.pitch * 7 * this.rows;
  },
};

// The visual centre of the tableau. The whole cloud is translated by
// -CENTER at the end of the build so it sways around its own middle
// rather than orbiting a corner of the room.
const CENTER = new THREE.Vector3(0, 1.02, 0.05);

// ============================================================
//  buffer builder
// ============================================================

const rand = (a: number, b: number) => a + Math.random() * (b - a);
// Approximately standard-normal: three uniforms summed, rescaled.
// Used for scan jitter, so the noise falls off instead of being a
// hard-edged uniform band.
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Growable parallel typed arrays. Points are pushed one at a time and
 * the backing buffers grow geometrically, so the scene definition can
 * use rejection sampling (density falloff, mesh perforations) without
 * anyone having to predict an exact final count up front.
 */
class Cloud {
  pos: Float32Array;
  seed: Float32Array;
  bright: Float32Array;
  size: Float32Array;
  flag: Float32Array;
  param: Float32Array;
  n = 0;
  private cap: number;

  constructor(cap: number) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.seed = new Float32Array(cap);
    this.bright = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.flag = new Float32Array(cap);
    this.param = new Float32Array(cap);
  }

  private grow(need: number) {
    let cap = this.cap;
    while (cap < need) cap = Math.ceil(cap * 1.5);
    const pos = new Float32Array(cap * 3);
    pos.set(this.pos.subarray(0, this.n * 3));
    this.pos = pos;
    const one = (src: Float32Array) => {
      const next = new Float32Array(cap);
      next.set(src.subarray(0, this.n));
      return next;
    };
    this.seed = one(this.seed);
    this.bright = one(this.bright);
    this.size = one(this.size);
    this.flag = one(this.flag);
    this.param = one(this.param);
    this.cap = cap;
  }

  push(x: number, y: number, z: number, b: number, s: number, flag = 0, param = 0) {
    if (this.n >= this.cap) this.grow(this.n + 1);
    const i = this.n++;
    const j = i * 3;
    this.pos[j] = x;
    this.pos[j + 1] = y;
    this.pos[j + 2] = z;
    this.seed[i] = Math.random();
    // Per-point brightness jitter. Real scans have wildly uneven
    // return intensity; a flat brightness per object looks synthetic.
    this.bright[i] = b * (0.8 + Math.random() * 0.4);
    this.size[i] = s * (0.82 + Math.random() * 0.36);
    this.flag[i] = flag;
    this.param[i] = param;
  }
}

/**
 * Applies a matrix to every point emitted since `start`. This is how
 * tilted heads, angled arms and reclined chair backs get built: emit
 * the part upright with a simple sampler, then rotate the range into
 * place. Matrix elements are read inline — a Vector3 round-trip per
 * point would allocate hundreds of thousands of times.
 */
function transformRange(c: Cloud, start: number, m: THREE.Matrix4) {
  const e = m.elements;
  const p = c.pos;
  for (let i = start; i < c.n; i++) {
    const j = i * 3;
    const x = p[j];
    const y = p[j + 1];
    const z = p[j + 2];
    p[j] = e[0] * x + e[4] * y + e[8] * z + e[12];
    p[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
    p[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
  }
}

/** Rotate everything emitted since `start` about an arbitrary pivot. */
function rotateRange(c: Cloud, start: number, pivot: V3, axis: V3, angle: number) {
  const m = new THREE.Matrix4()
    .makeTranslation(pivot[0], pivot[1], pivot[2])
    .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...axis).normalize(), angle))
    .multiply(new THREE.Matrix4().makeTranslation(-pivot[0], -pivot[1], -pivot[2]));
  transformRange(c, start, m);
}

// ============================================================
//  surface samplers
// ============================================================

type PlaneOpt = {
  /** Fraction of samples snapped to the patch border, for a crisp outline. */
  edge?: number;
  /** 0..1 — how aggressively density drops toward the corners. */
  falloff?: number;
  /** Normal-direction scan noise, in metres. */
  jitter?: number;
  /** Return true to reject a sample at normalised (a, t) — used for mesh holes. */
  holes?: (a: number, t: number) => boolean;
  /** Behaviour code from FLAG, applied to every point in the patch. */
  flag?: number;
};

/**
 * Samples a rectangular patch. `o` is the centre; `u` and `v` are
 * half-extent edge vectors, so the patch spans o ± u ± v and can face
 * any direction without a rotation matrix.
 */
function planePatch(
  c: Cloud, o: V3, u: V3, v: V3, count: number, b: number, s: number, opt: PlaneOpt = {}
) {
  // Unit normal, for scan jitter off the surface.
  let nx = u[1] * v[2] - u[2] * v[1];
  let ny = u[2] * v[0] - u[0] * v[2];
  let nz = u[0] * v[1] - u[1] * v[0];
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;

  const jit = opt.jitter ?? 0.0018;
  const edge = opt.edge ?? 0;
  const falloff = opt.falloff ?? 0;
  const holes = opt.holes;

  for (let i = 0; i < count; i++) {
    let a = rand(-1, 1);
    let t = rand(-1, 1);

    if (edge > 0 && Math.random() < edge) {
      // Pin one axis to the rim. Scans over-sample silhouette edges
      // (grazing angles return many hits), and it is what makes
      // keycaps and desk lips legible rather than mushy.
      if (Math.random() < 0.5) a = (a < 0 ? -1 : 1) * (1 - Math.abs(gauss()) * 0.012);
      else t = (t < 0 ? -1 : 1) * (1 - Math.abs(gauss()) * 0.012);
    }

    if (falloff > 0) {
      const k = Math.min(1, (a * a + t * t) / 2);
      if (Math.random() > 1 - falloff * k) continue;
    }
    if (holes && holes(a, t)) continue;

    const j = gauss() * jit;
    c.push(
      o[0] + u[0] * a + v[0] * t + nx * j,
      o[1] + u[1] * a + v[1] * t + ny * j,
      o[2] + u[2] * a + v[2] * t + nz * j,
      b, s, opt.flag ?? 0
    );
  }
}

type ShellOpt = {
  /** Latitude window in normalised -1..1, for partial shells (open-bottom forms). */
  yLo?: number;
  yHi?: number;
  jitter?: number;
};

/** Samples the *surface* of an ellipsoid — never its interior. */
function ellipsoidShell(
  c: Cloud, o: V3, r: V3, count: number, b: number, s: number, opt: ShellOpt = {}
) {
  const yLo = opt.yLo ?? -1;
  const yHi = opt.yHi ?? 1;
  const jit = opt.jitter ?? 0.005;
  for (let i = 0; i < count; i++) {
    const uy = rand(yLo, yHi);
    const ring = Math.sqrt(Math.max(0, 1 - uy * uy));
    const th = rand(0, TAU);
    const nx = ring * Math.cos(th);
    const nz = ring * Math.sin(th);
    const k = 1 + gauss() * jit;
    c.push(o[0] + nx * r[0] * k, o[1] + uy * r[1] * k, o[2] + nz * r[2] * k, b, s);
  }
}

/**
 * Samples the surface of a tapered tube between two points — limbs,
 * chair legs, cables, plant stems. Builds a proper orthonormal frame
 * around the axis; the previous version faked this with a fixed
 * y-squash, which is why limbs read as lumps instead of cylinders.
 */
function tubeShell(
  c: Cloud, p0: V3, p1: V3, r0: number, r1: number,
  count: number, b: number, s: number, jit = 0.05
) {
  let ax = p1[0] - p0[0];
  let ay = p1[1] - p0[1];
  let az = p1[2] - p0[2];
  const len = Math.hypot(ax, ay, az) || 1;
  ax /= len; ay /= len; az /= len;

  // Any vector not parallel to the axis, then Gram-Schmidt it.
  let px = Math.abs(ay) < 0.9 ? -az : 1;
  let py = 0;
  let pz = Math.abs(ay) < 0.9 ? ax : 0;
  const d = px * ax + py * ay + pz * az;
  px -= ax * d; py -= ay * d; pz -= az * d;
  const pl = Math.hypot(px, py, pz) || 1;
  px /= pl; py /= pl; pz /= pl;

  const qx = ay * pz - az * py;
  const qy = az * px - ax * pz;
  const qz = ax * py - ay * px;

  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const r = (r0 + (r1 - r0) * t) * (1 + gauss() * jit);
    const th = rand(0, TAU);
    const ct = Math.cos(th) * r;
    const st = Math.sin(th) * r;
    const L = len * t;
    c.push(
      p0[0] + ax * L + px * ct + qx * st,
      p0[1] + ay * L + py * ct + qy * st,
      p0[2] + az * L + pz * ct + qz * st,
      b, s
    );
  }
}

/** Horizontal disc (mug base, chair hub, monitor foot). */
function discY(
  c: Cloud, o: V3, R: number, count: number, b: number, s: number, inner = 0
) {
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(rand((inner / R) ** 2, 1)) * R;
    const th = rand(0, TAU);
    c.push(o[0] + Math.cos(th) * r, o[1] + gauss() * 0.0015, o[2] + Math.sin(th) * r, b, s);
  }
}

/** Horizontal torus ring — mug rims, caster treads, the crisp circles. */
function ringY(
  c: Cloud, o: V3, R: number, tube: number, count: number, b: number, s: number
) {
  for (let i = 0; i < count; i++) {
    const th = rand(0, TAU);
    const ph = rand(0, TAU);
    const rr = R + Math.cos(ph) * tube;
    c.push(o[0] + Math.cos(th) * rr, o[1] + Math.sin(ph) * tube, o[2] + Math.sin(th) * rr, b, s);
  }
}

/**
 * A cable hanging between two points, sagging under its own weight.
 * A parabola is visually indistinguishable from a true catenary at
 * this scale and far cheaper.
 */
function cableSag(
  c: Cloud, p0: V3, p1: V3, sag: number, radius: number,
  count: number, b: number, s: number
) {
  let ax = p1[0] - p0[0];
  const ay = p1[1] - p0[1];
  let az = p1[2] - p0[2];
  const hl = Math.hypot(ax, az) || 1;
  // Offset frame: horizontal-perpendicular, and vertical.
  const ox = -az / hl;
  const oz = ax / hl;
  for (let i = 0; i < count; i++) {
    const t = Math.random();
    const th = rand(0, TAU);
    const r = radius * (1 + gauss() * 0.12);
    const drop = sag * 4 * t * (1 - t);
    c.push(
      p0[0] + ax * t + ox * Math.cos(th) * r,
      p0[1] + ay * t - drop + Math.sin(th) * r,
      p0[2] + az * t + oz * Math.cos(th) * r,
      b, s
    );
  }
}

// ============================================================
//  lofted surfaces — the body
// ============================================================

/**
 * A cross-section of a lofted form. `n` is the superellipse exponent:
 * 2 is a plain ellipse, higher values square it off. Human torsos are
 * closer to a rounded rectangle than to a circle in section, and using
 * an ellipse everywhere is a big part of why a figure reads as a balloon.
 */
type Ring = {
  x?: number;
  y: number;
  z: number;
  rx: number;
  rz: number;
  n?: number;
};

/** Catmull-Rom through p1→p2, C1-continuous, so lofts have no creases. */
function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

type Lofted = {
  /** Interpolated ring at parameter t ∈ [0, rings.length-1]. */
  at: (t: number) => Required<Ring>;
  /** The t whose ring sits at world height y. Body forms only (monotonic y). */
  tForY: (y: number) => number;
  /** Point on the surface: `u` is the normalised x offset (-1..1 of rx). */
  surface: (t: number, u: number, lift?: number) => V3;
  last: number;
};

/**
 * Builds an interpolator over a ring list. Kept separate from the
 * emitter so clothing can be solved against exactly the same surface the
 * body was built from — hand-duplicating the radii is how the shirt
 * ended up floating off the chest the first time.
 */
function loftOf(rings: Ring[]): Lofted {
  const N = rings.length;
  const g = (i: number) => rings[Math.max(0, Math.min(N - 1, i))];

  const at = (t: number): Required<Ring> => {
    const i = Math.max(0, Math.min(N - 2, Math.floor(t)));
    const f = t - i;
    const a = g(i - 1); const b = g(i); const c = g(i + 1); const d = g(i + 2);
    return {
      x: catmull(a.x ?? 0, b.x ?? 0, c.x ?? 0, d.x ?? 0, f),
      y: catmull(a.y, b.y, c.y, d.y, f),
      z: catmull(a.z, b.z, c.z, d.z, f),
      rx: catmull(a.rx, b.rx, c.rx, d.rx, f),
      rz: catmull(a.rz, b.rz, c.rz, d.rz, f),
      n: catmull(a.n ?? 2, b.n ?? 2, c.n ?? 2, d.n ?? 2, f),
    };
  };

  // Height → parameter, via a small monotonic table. Cheaper and steadier
  // than bisecting per call, and clothing hits it thousands of times.
  const M = 160;
  const ys: number[] = [];
  for (let i = 0; i <= M; i++) ys.push(at((i / M) * (N - 1)).y);
  const tForY = (y: number) => {
    if (y <= ys[0]) return 0;
    if (y >= ys[M]) return N - 1;
    let lo = 0;
    let hi = M;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] <= y) lo = mid; else hi = mid;
    }
    const span = ys[hi] - ys[lo] || 1;
    return ((lo + (y - ys[lo]) / span) / M) * (N - 1);
  };

  const surface = (t: number, u: number, lift = 0): V3 => {
    const r = at(t);
    const uu = Math.max(-0.999, Math.min(0.999, u));
    // Solve the superellipse for the depth at this horizontal offset.
    const e = r.n;
    const w = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(uu), e)), 1 / e);
    return [r.x + uu * r.rx, r.y, r.z - w * r.rz - lift];
  };

  return { at, tForY, surface, last: N - 1 };
}

// ============================================================
//  the figure's anatomy
// ============================================================
//
//  ONE continuous surface from hips to crown. The earlier figure was an
//  assembly of separate primitives — an ellipsoid head parked on an
//  ellipsoid torso, tube arms with ball elbows — and that is precisely
//  what made it read as a doll: every joint was a visible seam between
//  two closed shapes, and a closed shape is a toy part.
//
//  Here the torso, neck and head are a single loft whose cross-section
//  varies smoothly, so there is no seam anywhere. The sections are
//  superellipses (n ≈ 2.6 through the chest) rather than circles,
//  because a human trunk is a rounded rectangle in section; circular
//  sections are the other half of why the old torso looked like a
//  balloon. The forward lean is baked into the rings' z, so the whole
//  upper body leans as one piece — rotating a separate head into place
//  would just reintroduce the seam.

const BODY_RINGS: Ring[] = [
  { y: 0.50, z: 0.44, rx: 0.205, rz: 0.165, n: 2.6 }, // hips, on the seat
  { y: 0.62, z: 0.425, rx: 0.198, rz: 0.155, n: 2.6 },
  { y: 0.76, z: 0.40, rx: 0.180, rz: 0.140, n: 2.6 }, // waist
  { y: 0.90, z: 0.375, rx: 0.196, rz: 0.148, n: 2.7 },
  { y: 1.04, z: 0.352, rx: 0.219, rz: 0.158, n: 2.8 }, // chest
  { y: 1.16, z: 0.335, rx: 0.226, rz: 0.156, n: 2.8 },
  { y: 1.26, z: 0.322, rx: 0.216, rz: 0.140, n: 2.6 }, // shoulder line
  { y: 1.33, z: 0.312, rx: 0.150, rz: 0.110, n: 2.2 }, // trapezius slope
  { y: 1.385, z: 0.302, rx: 0.076, rz: 0.079, n: 2.1 }, // neck base
  { y: 1.425, z: 0.292, rx: 0.061, rz: 0.067, n: 2.1 }, // neck
  { y: 1.468, z: 0.280, rx: 0.089, rz: 0.101, n: 2.1 }, // jaw
  { y: 1.525, z: 0.266, rx: 0.108, rz: 0.118, n: 2.05 }, // cheekbone
  { y: 1.595, z: 0.259, rx: 0.105, rz: 0.115, n: 2.05 }, // skull
  { y: 1.655, z: 0.261, rx: 0.066, rz: 0.074, n: 2.1 },
  { y: 1.682, z: 0.264, rx: 0.022, rz: 0.026, n: 2.2 }, // crown
];
const BODY = loftOf(BODY_RINGS);

/** Shoulder → elbow → wrist → hand as ONE swept form. The first ring
 *  starts inside the torso so the arm grows out of the shoulder instead
 *  of being socketed into it, and the elbow is a bend in a continuous
 *  taper rather than a sphere dropped at a corner. */
const armRings = (sx: number): Ring[] => [
  { x: sx * 0.17, y: 1.255, z: 0.325, rx: 0.088, rz: 0.088, n: 2.3 }, // inside the shoulder
  { x: sx * 0.225, y: 1.205, z: 0.315, rx: 0.079, rz: 0.080, n: 2.2 }, // deltoid
  { x: sx * 0.262, y: 1.10, z: 0.285, rx: 0.066, rz: 0.068 },
  { x: sx * 0.280, y: 1.00, z: 0.235, rx: 0.058, rz: 0.060 }, // upper arm
  { x: sx * 0.290, y: 0.935, z: 0.175, rx: 0.053, rz: 0.055 }, // elbow
  { x: sx * 0.298, y: 0.885, z: 0.105, rx: 0.048, rz: 0.049 },
  { x: sx * 0.303, y: 0.848, z: 0.038, rx: 0.041, rz: 0.042 }, // forearm
  { x: sx * 0.306, y: 0.827, z: -0.005, rx: 0.037, rz: 0.033 }, // wrist
  { x: sx * 0.309, y: 0.815, z: -0.045, rx: 0.044, rz: 0.021 }, // hand, flattening
  { x: sx * 0.311, y: 0.808, z: -0.085, rx: 0.043, rz: 0.016 }, // knuckles
];

/** Hip → knee → ankle → foot, likewise one form. */
const legRings = (sx: number): Ring[] => [
  { x: sx * 0.095, y: 0.545, z: 0.44, rx: 0.105, rz: 0.125, n: 2.5 }, // inside the hip
  { x: sx * 0.112, y: 0.505, z: 0.33, rx: 0.098, rz: 0.112, n: 2.4 },
  { x: sx * 0.122, y: 0.485, z: 0.18, rx: 0.091, rz: 0.100, n: 2.4 }, // thigh
  { x: sx * 0.129, y: 0.472, z: 0.04, rx: 0.084, rz: 0.092, n: 2.3 },
  { x: sx * 0.132, y: 0.455, z: -0.04, rx: 0.077, rz: 0.082, n: 2.2 }, // knee
  { x: sx * 0.134, y: 0.36, z: -0.062, rx: 0.067, rz: 0.070 },
  { x: sx * 0.135, y: 0.24, z: -0.072, rx: 0.058, rz: 0.060 }, // shin
  { x: sx * 0.136, y: 0.12, z: -0.078, rx: 0.048, rz: 0.050 },
  { x: sx * 0.137, y: 0.062, z: -0.082, rx: 0.042, rz: 0.046 }, // ankle
  { x: sx * 0.137, y: 0.032, z: -0.12, rx: 0.048, rz: 0.085, n: 2.5 }, // foot
  { x: sx * 0.137, y: 0.022, z: -0.175, rx: 0.042, rz: 0.045, n: 2.4 }, // toe
];

// ============================================================
//  dot-matrix type
// ============================================================

/**
 * A 3x5 bitmap font. Each glyph is five rows of three bits, most
 * significant bit leftmost. Small enough to be legible when every lit
 * dot becomes a little cluster of points, which is the whole trick — the
 * panels read as real terminal text rather than as texture noise.
 */
const FONT: Record<string, number[]> = {
  A: [0b010, 0b101, 0b111, 0b101, 0b101],
  B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b011],
  D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111],
  F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b011, 0b100, 0b101, 0b101, 0b011],
  H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111],
  J: [0b001, 0b001, 0b001, 0b101, 0b010],
  K: [0b101, 0b101, 0b110, 0b101, 0b101],
  L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101],
  N: [0b110, 0b101, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b010],
  P: [0b110, 0b101, 0b110, 0b100, 0b100],
  Q: [0b010, 0b101, 0b101, 0b111, 0b011],
  R: [0b110, 0b101, 0b110, 0b101, 0b101],
  S: [0b011, 0b100, 0b010, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b111],
  V: [0b101, 0b101, 0b101, 0b101, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101],
  X: [0b101, 0b101, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010],
  Z: [0b111, 0b001, 0b010, 0b100, 0b111],
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b010, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  ' ': [0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0b010],
  ':': [0, 0b010, 0, 0b010, 0],
  '-': [0, 0, 0b111, 0, 0],
  '_': [0, 0, 0, 0, 0b111],
  '/': [0b001, 0b001, 0b010, 0b100, 0b100],
  '=': [0, 0b111, 0, 0b111, 0],
  '*': [0b101, 0b010, 0b111, 0b010, 0b101],
  '%': [0b101, 0b001, 0b010, 0b100, 0b101],
  '>': [0b100, 0b010, 0b001, 0b010, 0b100],
  '[': [0b011, 0b010, 0b010, 0b010, 0b011],
  ']': [0b110, 0b010, 0b010, 0b010, 0b110],
};

/**
 * TEXT RUNS ALONG -X, NOT +X.
 *
 * The camera sits at negative z and looks along +z (see START / LOOK), a
 * 180° turn from three's default -z view direction, so screen-right in this
 * scene is world -x. Every caller below therefore steps its characters in
 * -x and starts from the RIGHT edge of the block.
 *
 * Get this wrong and the type is drawn back-to-front and each glyph is
 * mirrored on top of that — which is what the four wall panels and the
 * monitor were doing. It went unnoticed for as long as the type was too
 * small to read: it looks like plausible dot-matrix noise at a distance and
 * only resolves into gibberish once the camera is close enough to read it.
 *
 * Emits one line of text. `right`/`up` are per-DOT step vectors.
 *
 * Each lit cell of the matrix becomes ONE fat point (SZ.glyph), not a
 * scattered cluster of fine ones. A cluster of four small points spread
 * over ±0.3 of a cell was individually visible and the characters never
 * closed up — the panels read as speckle. A single dot roughly as wide
 * as the cell pitch gives a real dot-matrix display.
 */
function glyphLine(
  c: Cloud, text: string, origin: V3, right: V3, up: V3,
  b: number, s: number, dots: number,
  flag = FLAG.glyph,
  /**
   * Per-DOT aParam. Defaults to one shared random id per character, so a
   * whole glyph blinks as a unit; the scrolling screens override it to
   * carry each dot's own height instead. See FLAG.code for why that has
   * to be per dot rather than per character.
   */
  paramOf?: (p: V3) => number
) {
  let col = 0;
  for (const ch of text.toUpperCase()) {
    const g = FONT[ch];
    if (g) {
      // One id per character, shared by all its dots, so the glyph
      // blinks as a unit in the shader.
      const gid = Math.random();
      for (let row = 0; row < 5; row++) {
        const bits = g[row];
        for (let bx = 0; bx < 3; bx++) {
          if (!(bits & (1 << (2 - bx)))) continue;
          const cx = col + bx;
          const cy = 4 - row; // row 0 is the top line
          for (let k = 0; k < dots; k++) {
            const jx = cx + rand(-0.1, 0.1);
            const jy = cy + rand(-0.1, 0.1);
            const p: V3 = [
              origin[0] + right[0] * jx + up[0] * jy,
              origin[1] + right[1] * jx + up[1] * jy,
              origin[2] + right[2] * jx + up[2] * jy,
            ];
            c.push(p[0], p[1], p[2], b, s, flag, paramOf ? paramOf(p) : gid);
          }
        }
      }
    }
    col += 4; // 3 dots of glyph + 1 of tracking
  }
}

/**
 * A floating terminal panel: several lines of dot-matrix text inside a
 * thin bright frame, built facing -z then yawed into place.
 */
function terminalPanel(
  c: Cloud, lines: string[], origin: V3, dot: number, b: number, yaw: number, dots = 3
) {
  const start = c.n;
  const cols = Math.max(...lines.map((l) => l.length)) * 4;
  const rows = lines.length * 7;
  lines.forEach((line, i) => {
    glyphLine(
      c, line,
      [origin[0] + (cols * dot) / 2, origin[1] + (rows / 2 - 7 * i - 5) * dot, origin[2]],
      [-dot, 0, 0], [0, dot, 0], b, SZ.glyph, dots
    );
  });
  // Frame, a little behind the type so it never collides with a glyph.
  // Scaled by PERIMETER, not area: an area-scaled count gave a 15-line
  // panel a few hundred points spread around its border, which did not
  // read as a frame at all.
  const hw = (cols * dot) / 2 + dot * 2;
  const hh = (rows * dot) / 2 + dot * 2;
  planePatch(c, [origin[0], origin[1], origin[2] + 0.006], [hw, 0, 0], [0, hh, 0],
    Math.round((hw + hh) * 4 * 1200), B.mid * 0.7, SZ.base, { edge: 0.97, jitter: 0.001 });
  rotateRange(c, start, origin, [0, 1, 0], yaw);
}

/**
 * Lines of code on a flat, VERTICAL screen, wired for the scrolling
 * FLAG.code behaviour.
 *
 * Upright is not a style choice. The shader scrolls a code point by
 * translating it in world y, so on a PITCHED screen the text walks off the
 * plane as it rises — about 15mm over a full block on a 3° tilt, which is
 * plainly visible by the time the camera lands on the panel. Yaw keeps
 * vertical lines vertical and is therefore fine; pitch is not. Anything
 * carrying FLAG.code must be built upright and may only be turned about y.
 * That is why the hero monitor lost the few degrees of backward tilt it
 * used to have, and why the laptop lid — which has to be pitched to be a
 * laptop — gets static flickering text instead.
 *
 * Every code screen in the scene shares one block height, because the
 * shader has exactly one: a point's own y minus its row fraction recovers
 * whichever block it belongs to, so screens may sit at different heights
 * but must all be CODE.rows rows tall.
 */
function codeScreen(c: Cloud, lines: string[], centre: V3, b: number) {
  // Authored top-to-bottom as you would read it, emitted bottom-up, so the
  // last line given is the newest and enters at the bottom of the screen.
  const rows = lines.slice(0, CODE.rows).reverse();
  const cols = Math.max(...rows.map((l) => l.length)) * 4;
  const y0 = centre[1] - CODE.h / 2;
  const x0 = centre[0] + (cols * CODE.pitch) / 2;
  rows.forEach((line, i) => {
    glyphLine(
      c, line,
      [x0, y0 + i * CODE.lineH + CODE.pitch, centre[2]],
      [-CODE.pitch, 0, 0], [0, CODE.pitch, 0],
      b, SZ.code, 3, FLAG.code,
      (pt) => clamp01((pt[1] - y0) / CODE.h)
    );
  });
}

// ============================================================
//  the figure — built out of code
// ============================================================

/** Weighted toward 0 and 1, so the body reads as binary at a glance and
 *  resolves into hex and fragments of syntax when you look closer. */
const CODE_CHARS = '01010101010101ABCDEF23456789XZ:/><=%*_.';
const randomCodeChar = () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];

/**
 * Stamps ONE character centred on a 3D point, lying in the world XY
 * plane.
 *
 * Billboarding to XY rather than to the body's own surface tangent is
 * deliberate: wrapped onto the tangent, every glyph around the sides of
 * the figure turns edge-on and becomes an unreadable streak. The camera
 * is near-frontal and sways only ±14°, so a flat XY plane keeps all of
 * them legible while their 3D positions still describe the form.
 */
function stampGlyph(
  c: Cloud, ch: string, p: V3, dot: number, b: number, s: number,
  dots = 1, flag = FLAG.glyph
) {
  const g = FONT[ch];
  if (!g) return;
  const gid = Math.random();
  for (let row = 0; row < 5; row++) {
    const bits = g[row];
    for (let bx = 0; bx < 3; bx++) {
      if (!(bits & (1 << (2 - bx)))) continue;
      for (let k = 0; k < dots; k++) {
        c.push(
          p[0] - (bx - 1 + rand(-0.12, 0.12)) * dot, // -x: see glyphLine
          p[1] + (2 - row + rand(-0.12, 0.12)) * dot,
          p[2],
          b, s, flag, gid
        );
      }
    }
  }
}

/**
 * Clothes a lofted form in code: walks the form and lays characters out
 * in ROWS that wrap around it, like text printed on a body.
 *
 * The lattice is the whole trick. Scattered at random over the surface
 * the characters read as noisy texture — you see a speckled mass, not
 * code. Code is organised in lines, so aligning them into rows and
 * columns is what makes the eye call it code, and it takes an order of
 * magnitude fewer glyphs than a scatter to do it.
 *
 * `solidity(y)` drives everything at once — how likely a character is
 * kept, how bright it is, and how far it drifts off the form. That
 * single function produces "solid at the top, dissolving downward":
 * up near the hood the rows are full, bright and exactly on the form; lower
 * down they thin out, dim, and wander away from it.
 */
function glyphBody(
  c: Cloud, L: Lofted, dot: number, b: number,
  solidity: (y: number) => number,
  opt: { rowGap?: number; colGap?: number; drift?: number; tLo?: number; tHi?: number } = {}
) {
  const rowGap = opt.rowGap ?? 0.052;
  const colGap = opt.colGap ?? 0.044;
  const drift = opt.drift ?? 0.09;
  const tLo = (opt.tLo ?? 0) * L.last;
  const tHi = (opt.tHi ?? 1) * L.last;

  const WALK = 400;
  let prev = L.at(tLo);
  let acc = rowGap; // fire a row on the first step
  for (let i = 1; i <= WALK; i++) {
    const t = tLo + ((tHi - tLo) * i) / WALK;
    const r = L.at(t);
    acc += Math.hypot(r.x - prev.x, r.y - prev.y, r.z - prev.z);
    prev = r;
    if (acc < rowGap) continue;
    acc = 0;

    const sol = solidity(r.y);
    if (sol <= 0.01) continue;

    // One row of characters around this cross-section.
    const perim = TAU * Math.sqrt((r.rx * r.rx + r.rz * r.rz) / 2);
    const n = Math.max(3, Math.round(perim / colGap));
    const phase = Math.random() * TAU;
    const d = 1 - sol;

    for (let k = 0; k < n; k++) {
      if (Math.random() > sol) continue;
      const th = phase + (k / n) * TAU;
      const ex = 2 / r.n;
      const ct = Math.cos(th);
      const st = Math.sin(th);
      const nx = Math.sign(ct) * Math.pow(Math.abs(ct), ex);
      const nz = Math.sign(st) * Math.pow(Math.abs(st), ex);
      stampGlyph(
        c, randomCodeChar(),
        [
          r.x + nx * r.rx + nx * d * rand(0, drift) + gauss() * d * 0.02,
          r.y - d * rand(0, drift * 0.6) + gauss() * d * 0.012,
          r.z + nz * r.rz + nz * d * rand(0, drift) + gauss() * d * 0.02,
        ],
        dot, b * (0.45 + 0.55 * sol), SZ.glyphSm, 1
      );
    }
  }
}

/**
 * The hood, up. This replaces the Anonymous mask outright, and with it the
 * entire problem of building a face: there is no face. The silhouette does
 * all the work, and a dark opening is a stronger anonymity cue than any
 * amount of painted detail — it is also the one thing a point cloud is
 * naturally good at, because emptiness costs nothing to render.
 *
 * ---------- the three things that make it read ----------
 *
 * THE OPENING IS A REAL HOLE. Points inside the face ellipse are simply
 * never emitted, so the shell has a hole in it rather than a dark patch
 * painted on a closed surface. A painted patch reads as a mark on a ball;
 * a hole reads as a cavity.
 *
 * THE CAVITY IS FILLED WITH SOMETHING DARK AND OPAQUE. The body is made
 * only of glyphs — there is no skull surface behind the opening — so
 * without an inner shell you would see the room straight through the head.
 * The inner shell is dim but fully opaque: brightness drives colour in the
 * fragment shader, not alpha, so a near-black point still writes depth and
 * still occludes the starfield behind it.
 *
 * THE HEM IS THE SILHOUETTE. One crisp bright ring around the opening is
 * what the eye locks onto, and it is the only part of the hood emitted as
 * plain points rather than glyphs — a rim spelled in characters has a
 * ragged edge, and the edge is the whole read.
 */
// Rings run BOTTOM to TOP, like BODY's. Not cosmetic: loftOf builds its
// height→parameter table assuming y ascends, so a top-down list makes
// tForY return the peak for every height and the hem collapses to a point.
const HOOD = loftOf([
  { y: 1.256, z: 0.326, rx: 0.222, rz: 0.152, n: 2.6 }, // sat on the shoulders
  { y: 1.302, z: 0.324, rx: 0.204, rz: 0.166, n: 2.6 },
  { y: 1.358, z: 0.320, rx: 0.192, rz: 0.182, n: 2.5 }, // flaring out
  { y: 1.420, z: 0.315, rx: 0.181, rz: 0.196, n: 2.5 },
  { y: 1.482, z: 0.310, rx: 0.173, rz: 0.197, n: 2.4 },
  { y: 1.545, z: 0.305, rx: 0.164, rz: 0.191, n: 2.4 },
  { y: 1.602, z: 0.301, rx: 0.145, rz: 0.170, n: 2.3 },
  { y: 1.652, z: 0.300, rx: 0.104, rz: 0.124, n: 2.2 },
  { y: 1.672, z: 0.300, rx: 0.050, rz: 0.070, n: 2.2 }, // peak
]);

// The face opening, as a half-width in metres at a given height. Zero
// means the fabric is closed across the front at that height.
//
// This is the third shape this opening has had, and the first that reads.
// An ellipse gave a porthole. An arch on a sphere gave a slot in a ball.
// The problem was never the hole — it was the hood: a single ellipsoid is
// a HELMET, and no hole cut in a helmet looks like cloth. A hood's
// silhouette is a bell that narrows to a peak at the crown and flares out
// onto the shoulders, which is why it is a loft here, exactly like the
// body, and why the opening is authored in metres against that loft
// rather than in some normalised direction space of its own.
const FACE_TOP = 1.627;
const FACE_BOT = 1.416;
const FACE_PROFILE: [number, number][] = [
  [1.00, 0.030], // pinched under the overhanging brow
  [0.80, 0.082],
  [0.56, 0.106], // widest, at eye level
  [0.28, 0.102],
  [0.00, 0.078], // still open at the jaw, where the neck runs down
];
const faceHalfWidth = (y: number) => {
  if (y > FACE_TOP || y < FACE_BOT) return 0;
  const v = (y - FACE_BOT) / (FACE_TOP - FACE_BOT);
  if (v >= FACE_PROFILE[0][0]) return FACE_PROFILE[0][1];
  for (let i = 0; i < FACE_PROFILE.length - 1; i++) {
    const [v0, w0] = FACE_PROFILE[i];
    const [v1, w1] = FACE_PROFILE[i + 1];
    if (v <= v0 && v >= v1) return w0 + ((w1 - w0) * (v0 - v)) / (v0 - v1);
  }
  return FACE_PROFILE[FACE_PROFILE.length - 1][1];
};

/** Superellipse direction at angle `th` for a ring of exponent `n`. */
const ringDir = (th: number, n: number): [number, number] => {
  const ex = 2 / n;
  const ct = Math.cos(th);
  const st = Math.sin(th);
  return [
    Math.sign(ct) * Math.pow(Math.abs(ct), ex),
    Math.sign(st) * Math.pow(Math.abs(st), ex),
  ];
};

function hood(c: Cloud, q: (n: number) => number) {
  const LAST = HOOD.last;

  // Widest ring, so the substrate can be area-weighted: sampling (t, th)
  // uniformly puts as many points on the narrow peak as on the wide
  // shoulders, which reads as a bright cap on a dim body.
  let maxPerim = 0;
  for (let i = 0; i <= 40; i++) {
    const r = HOOD.at((LAST * i) / 40);
    maxPerim = Math.max(maxPerim, r.rx + r.rz);
  }

  /** True if this point falls in the face opening. */
  const inFace = (x: number, y: number, nz: number) =>
    nz < 0 && Math.abs(x) < faceHalfWidth(y);

  // ---- fabric substrate ----
  // A dense fine-grain shell carries the FORM; the code rides on top of
  // it. The glyph-only version came out to a few hundred characters over
  // the whole hood — loose speckle, not the solid anchor of the frame.
  // Still a surface, never a volume.
  let placed = 0;
  const want = q(34000);
  for (let guard = 0; placed < want && guard < want * 6; guard++) {
    const t = rand(0, LAST);
    const r = HOOD.at(t);
    if (Math.random() > (r.rx + r.rz) / maxPerim) continue; // area weighting
    const [nx, nz] = ringDir(rand(0, TAU), r.n);
    const g = 1 + gauss() * 0.006;
    const x = r.x + nx * r.rx * g;
    if (inFace(x, r.y, nz)) continue;
    placed++;
    c.push(x, r.y + gauss() * 0.0016, r.z + nz * r.rz * g, B.skin * 0.8, SZ.fine);
  }

  // ---- code over the fabric ----
  // Rows around the form, characters spaced along each row — the same
  // organising principle as glyphBody, and for the same reason: scattered
  // characters read as speckle, aligned ones read as code.
  const ROWS = 30;
  for (let i = 0; i < ROWS; i++) {
    const t = (LAST * i) / (ROWS - 1);
    const r = HOOD.at(t);
    const perim = TAU * Math.sqrt((r.rx * r.rx + r.rz * r.rz) / 2);
    const n = Math.max(4, Math.round(perim / 0.024));
    const phase = Math.random() * TAU;
    for (let k = 0; k < n; k++) {
      const [nx, nz] = ringDir(phase + (k / n) * TAU, r.n);
      const g = 1.014;
      const x = r.x + nx * r.rx * g;
      if (inFace(x, r.y, nz)) continue;
      stampGlyph(
        c, randomCodeChar(), [x, r.y, r.z + nz * r.rz * g],
        0.0080, B.skin * 1.22, SZ.bold, 1
      );
    }
  }

  // ---- the hem around the opening ----
  // Sits on the boundary of the cut, one side or the other, with real
  // thickness across it. Dim enough to be cloth: a tight bright line here
  // draws a wire, and a wire around a hole is a porthole again.
  for (let i = 0; i < q(7000); i++) {
    const y = rand(FACE_BOT, FACE_TOP);
    const w = faceHalfWidth(y);
    if (w <= 0) continue;
    const t = HOOD.tForY(y);
    const r = HOOD.at(t);
    const x = (Math.random() < 0.5 ? -1 : 1) * w;
    // Depth of the ring's front surface at this horizontal offset.
    const frac = Math.min(0.999, Math.abs(x - r.x) / r.rx);
    const zOff = r.rz * Math.pow(Math.max(0, 1 - Math.pow(frac, r.n)), 1 / r.n);
    c.push(
      x + gauss() * 0.004,
      y + gauss() * 0.003,
      r.z - zOff * (1.02 + gauss() * 0.03),
      B.edge * 1.02, SZ.base
    );
  }

  // ---- the dark inside ----
  // The body is only glyphs — there is no skull behind the opening — so
  // without this you would see the room straight through the head. It is
  // dim but fully opaque: brightness drives colour in the fragment shader,
  // not alpha, so a near-black point still writes depth and still occludes
  // the starfield. Back two-thirds only; the front of this shell would sit
  // between the camera and the cavity, where the outer shell hides it.
  for (let i = 0; i < q(14000); i++) {
    const t = rand(LAST * 0.05, LAST);
    const r = HOOD.at(t);
    const [nx, nz] = ringDir(rand(0, TAU), r.n);
    if (nz < -0.34) continue;
    const g = 0.80;
    c.push(
      r.x + nx * r.rx * g,
      r.y,
      r.z + nz * r.rz * g,
      B.bg * 0.40, SZ.fine
    );
  }

  // ---- a very few glyphs deep in the shadow ----
  // Just enough to say the cavity has depth rather than being a hole cut
  // in the frame. The first pass put 300 of these at B.bg * 1.15 and they
  // massed into a bright blob filling the opening — brighter than the
  // fabric around it, which is the exact opposite of a shadowed face.
  for (let i = 0; i < q(70); i++) {
    stampGlyph(
      c, randomCodeChar(),
      [rand(-0.045, 0.045), rand(1.470, 1.585), rand(0.34, 0.40)],
      0.0090, B.bg * 0.62, SZ.glyphSm, 1
    );
  }
}

/**
 * The details that say "hoodie" rather than "robe": a kangaroo pocket, two
 * drawstrings, and a cuff band closing each sleeve. All in code, like the
 * rest of the figure.
 *
 * The drape that seats the hood on the shoulders used to live here as its
 * own loft. It does not any more — HOOD's own rings run all the way down to
 * the shoulder line, so a second lofted surface over the same 0.17m was
 * two sets of fabric occupying one space.
 */
function hoodie(c: Cloud, q: (n: number) => number) {
  const surfAt = (u: number, y: number, lift = 0): V3 =>
    BODY.surface(BODY.tForY(y), u, lift);

  // Kangaroo pocket: a band of denser, brighter characters across the
  // belly, with a crisp top edge where the opening would be.
  for (let i = 0; i < q(230); i++) {
    const t = Math.random();
    const p = surfAt(rand(-0.62, 0.62), 1.00 - t * 0.14, 0.012);
    stampGlyph(c, randomCodeChar(), p, 0.0105, B.obj * 1.15, SZ.glyphSm, 1);
  }
  for (let i = 0; i < q(1500); i++) {
    const p = surfAt(rand(-0.66, 0.66), 1.005 + gauss() * 0.004, 0.016);
    c.push(p[0], p[1], p[2], B.edge * 1.05, SZ.base);
  }

  // Drawstrings: two cords from just inside the hem, down the chest. Small,
  // but they are the detail that makes the garment specific.
  for (const sx of [-1, 1]) {
    const top: V3 = [sx * 0.052, 1.404, 0.176];
    const end: V3 = [sx * 0.060, 1.198, 0.196];
    tubeShell(c, top, end, 0.0035, 0.0032, q(900), B.edge * 1.1, SZ.base, 0.06);
    // Aglet.
    tubeShell(c, end, [end[0], end[1] - 0.022, end[2]], 0.0052, 0.0048, q(320), B.edge * 1.25, SZ.bold, 0.04);
  }

  // Cuff bands: a brighter ring of characters where each sleeve ends, so
  // the arms terminate in a garment instead of just thinning out.
  for (const sx of [-1, 1]) {
    for (let i = 0; i < q(120); i++) {
      const th = rand(0, TAU);
      const r = 0.046;
      stampGlyph(
        c, randomCodeChar(),
        [sx * 0.306 + Math.cos(th) * r * 0.5, 0.836 + rand(-0.014, 0.014), -0.004 + Math.sin(th) * r],
        0.0105, B.edge, SZ.glyphSm, 1
      );
    }
  }
}


// ============================================================
//  the scene
// ============================================================

function buildSteps(c: Cloud, soft: Cloud): Array<() => void> {
  const q = (n: number) => Math.max(1, Math.round(n * QUALITY));
  const steps: Array<() => void> = [];

  // Floor extent, shared by the slab and the grid so they cannot drift
  // apart. It has to reach past the camera's start (room z ≈ -2.6) but
  // must STOP at the back wall — run past it and you see floorboards
  // through the window where deep space should be. So the far edge is
  // pinned TO the wall and the patch is grown forward and sideways from
  // there, rather than the centre being moved and the two drifting apart.
  const WALL_Z = 1.75;
  const FHX = 4.35;
  const FHZ = 3.95;
  const FZ = WALL_Z - FHZ;

  // ---------- room ----------
  steps.push(() => {
    // Floor. Deliberately huge with a hard radial falloff so it fades
    // into black instead of ending on a visible rectangular edge —
    // scans thin out with distance and grazing angle, they don't stop.
    planePatch(c, [0, 0, FZ], [FHX, 0, 0], [0, 0, FHZ], q(82000), B.bg, SZ.fine, {
      falloff: 0.94, jitter: 0.004,
    });
  });
  steps.push(() => {
    // Tron grid over the floor. Lines are brighter than the floor
    // speckle but well under the figure, and share the floor's radial
    // falloff so they dissolve rather than ending on a hard edge.
    for (let i = -8; i <= 8; i++) {
      const d = i * 0.45;
      planePatch(c, [d, 0.005, FZ], [0.005, 0, 0], [0, 0, FHZ], q(430), B.mid, SZ.base, {
        falloff: 0.93, jitter: 0.0008,
      });
      planePatch(c, [0, 0.005, FZ + d], [FHX * 0.97, 0, 0], [0, 0, 0.005], q(430), B.mid, SZ.base, {
        falloff: 0.93, jitter: 0.0008,
      });
    }
  });

  steps.push(() => {
    // The back wall is a WINDOW rather than a slab — the surround stays
    // solid, the middle is open, and the starfield sits beyond it. This
    // is the whole "space beyond" read.
    //
    // The aperture is deliberately modest and the frame dim. At full
    // edge brightness across 3m it became an enormous bright rectangle
    // behind the figure that pulled the eye straight off him, which is
    // the opposite of the restrained brief. The surround carries more
    // points now so the frame reads as cut INTO a wall rather than
    // floating in the dark.
    const zw = WALL_Z;
    const ax = 1.4; // aperture half-width
    const ay0 = 0.55;
    const ay1 = 2.05;
    const ayc = (ay0 + ay1) / 2;
    const ayh = (ay1 - ay0) / 2;
    // Surround: left, right, header, sill.
    // Reaches the full width and height of the frame now. The old surround
    // stopped at |x| = 3.3 with a 0.78 falloff, which faded it to nothing
    // barely a metre out from the aperture and left the left, right and top
    // thirds of the establishing shot as flat black.
    const sw = 1.48; // half-width of each side pier
    planePatch(c, [-(ax + sw), 1.45, zw], [sw, 0, 0], [0, 1.45, 0], q(16000), B.bg * 1.14, SZ.fine, { falloff: 0.42 });
    planePatch(c, [ax + sw, 1.45, zw], [sw, 0, 0], [0, 1.45, 0], q(16000), B.bg * 1.14, SZ.fine, { falloff: 0.42 });
    planePatch(c, [0, (ay1 + 2.94) / 2, zw], [ax + sw * 2, 0, 0], [0, (2.94 - ay1) / 2, 0], q(11000), B.bg * 1.14, SZ.fine, { falloff: 0.4 });
    planePatch(c, [0, ay0 / 2, zw], [ax, 0, 0], [0, ay0 / 2, 0], q(3600), B.bg * 1.08, SZ.fine, { falloff: 0.45 });
    // Aperture edge — crisp enough to read as a frame, dim enough to sit
    // behind the subject.
    planePatch(c, [0, ayc, zw - 0.01], [ax, 0, 0], [0, ayh, 0], q(3600), B.mid, SZ.base, { edge: 0.97 });
    // Cross mullions.
    planePatch(c, [0, ayc, zw - 0.015], [0.012, 0, 0], [0, ayh, 0], q(1100), B.mid, SZ.base, {});
    planePatch(c, [0, ayc, zw - 0.015], [ax, 0, 0], [0, 0.012, 0], q(1400), B.mid, SZ.base, {});
  });

  // ---------- the rest of the room ----------
  // Everything here exists to answer one problem with the establishing
  // shot: it was a lit figure in a void, with a floor and a window and
  // black everywhere else. So the space now has side walls, a ceiling, and
  // real objects standing at three different depths.
  //
  // All of it is authored DIM — B.bg and B.mid, never B.obj or above — and
  // most of it carries a falloff. The subject has to stay dominant, and the
  // fastest way to lose him is to fill his room with things as bright as he
  // is. Depth fog (uFogNear 2.4) does the rest of the work for free: these
  // pieces sit 2 to 6 metres out, so they arrive already darkened.
  steps.push(() => {
    // Side walls. Set outside the frustum at the back wall's depth but well
    // inside it near the camera, so they read as walls converging toward the
    // window rather than as two flat slabs.
    for (const sx of [-1, 1]) {
      planePatch(c, [sx * 3.55, 1.45, WALL_Z - 1.75], [0, 0, 1.75], [0, 1.45, 0],
        q(15000), B.bg * 0.92, SZ.fine, { falloff: 0.6, jitter: 0.005 });
      // Skirting, to land the wall on the floor instead of fading into it.
      planePatch(c, [sx * 3.55, 0.055, WALL_Z - 1.75], [0, 0, 1.75], [0, 0.055, 0],
        q(2200), B.mid * 0.8, SZ.base, { falloff: 0.5 });
    }

    // Ceiling, plus beams across it. The top third of the opening frame was
    // pure black; this is what closes it.
    planePatch(c, [0, 2.94, WALL_Z - 1.7], [3.5, 0, 0], [0, 0, 1.7],
      q(17000), B.bg * 0.8, SZ.fine, { falloff: 0.72, jitter: 0.005 });
    for (let i = 0; i < 5; i++) {
      const z = WALL_Z - 0.35 - i * 0.62;
      planePatch(c, [0, 2.88, z], [3.4, 0, 0], [0, 0, 0.045],
        q(1700), B.mid * 0.85, SZ.base, { falloff: 0.45, edge: 0.3 });
    }
  });

  steps.push(() => {
    // Server rack, back left: the one piece of background furniture allowed
    // to blink. Its LEDs use FLAG.glyph, whose whole purpose is that a
    // character blinks as a unit — an LED is the same thing with one dot.
    const rx = -2.06;
    const rz = 0.92;
    const hw = 0.28;
    const hd = 0.32;
    // Front face, sides, top.
    planePatch(c, [rx, 1.0, rz - hd], [hw, 0, 0], [0, 1.0, 0], q(9000), B.mid * 0.72, SZ.fine, { edge: 0.2 });
    planePatch(c, [rx - hw, 1.0, rz], [0, 0, hd], [0, 1.0, 0], q(6000), B.bg * 1.15, SZ.fine, { falloff: 0.3 });
    planePatch(c, [rx + hw, 1.0, rz], [0, 0, hd], [0, 1.0, 0], q(6000), B.bg * 1.15, SZ.fine, { falloff: 0.3 });
    planePatch(c, [rx, 2.0, rz], [hw, 0, 0], [0, 0, hd], q(2600), B.mid * 0.7, SZ.fine, { edge: 0.25 });
    // Bays: a crisp horizontal line per unit, with a few status LEDs.
    for (let i = 0; i < 16; i++) {
      const y = 0.14 + i * 0.116;
      planePatch(c, [rx, y, rz - hd - 0.004], [hw * 0.94, 0, 0], [0, 0.004, 0],
        q(320), B.edge * 0.8, SZ.base, {});
      for (let k = 0; k < 3; k++) {
        if (Math.random() < 0.45) continue;
        c.push(
          rx - hw * 0.78 + k * 0.032 + gauss() * 0.001,
          y + 0.03,
          rz - hd - 0.008,
          B.edge * 1.25, SZ.bold, FLAG.glyph, Math.random()
        );
      }
    }
    // Bundled cabling spilling out of the back and along the floor.
    cableSag(c, [rx + 0.1, 1.6, rz + hd], [rx + 0.9, 0.02, rz - 0.4], 0.22, 0.012, q(2600), B.bg * 1.2, SZ.base);
    cableSag(c, [rx - 0.05, 1.2, rz + hd], [rx - 0.7, 0.02, rz - 0.2], 0.18, 0.009, q(2000), B.bg * 1.2, SZ.base);
  });

  steps.push(() => {
    // Side desk, right, with a laptop on it. This is the "laptop screen"
    // in the brief — and the reason it does NOT scroll: a laptop lid has to
    // be pitched to read as a laptop, and FLAG.code only survives on an
    // upright surface (see codeScreen). So its screen gets the same static
    // flickering text the wall panels use, which is the right call anyway —
    // two independently scrolling screens either side of frame would pull
    // the eye off the hero panel.
    const dx = 1.92;
    const dz = 0.22;
    planePatch(c, [dx, 0.72, dz], [0.42, 0, 0], [0, 0, 0.3], q(9000), B.mid * 0.85, SZ.fine, { edge: 0.16 });
    planePatch(c, [dx, 0.709, dz + 0.3], [0.42, 0, 0], [0, 0.011, 0], q(2200), B.obj * 0.8, SZ.bold, { edge: 0.3 });
    for (const sx of [-1, 1]) {
      planePatch(c, [dx + sx * 0.4, 0.36, dz], [0, 0.36, 0], [0, 0, 0.26], q(3000), B.mid * 0.7, SZ.fine, { edge: 0.14 });
    }
    // Laptop: base on the desk, lid raised and pitched back.
    planePatch(c, [dx, 0.732, dz - 0.02], [0.16, 0, 0], [0, 0, 0.11], q(3000), B.obj * 0.85, SZ.fine, { edge: 0.24 });
    const lidStart = c.n;
    planePatch(c, [dx, 0.845, dz - 0.13], [0.155, 0, 0], [0, 0.105, 0], q(4200), B.bg * 0.8, SZ.base, { edge: 0.2 });
    glyphLine(c, '> TAIL -F  AGENT.LOG', [dx + 0.115, 0.905, dz - 0.132], [-0.0072, 0, 0], [0, 0.0072, 0], B.screen * 0.8, SZ.code, 1);
    glyphLine(c, '  STEP 41  OK', [dx + 0.115, 0.858, dz - 0.132], [-0.0072, 0, 0], [0, 0.0072, 0], B.screen * 0.8, SZ.code, 1);
    glyphLine(c, '  TOKENS 128K', [dx + 0.115, 0.811, dz - 0.132], [-0.0072, 0, 0], [0, 0.0072, 0], B.screen * 0.8, SZ.code, 1);
    rotateRange(c, lidStart, [dx, 0.74, dz - 0.13], [1, 0, 0], 0.2);
  });

  steps.push(() => {
    // Shelving, far left, and two crates on the floor. Pure depth cues:
    // they give the eye something at 3m and 4.5m so the room has stages
    // rather than a subject and a backdrop.
    const sx = -2.94;
    for (const y of [1.34, 1.76]) {
      planePatch(c, [sx, y, 0.35], [0.3, 0, 0], [0, 0, 0.28], q(3400), B.mid * 0.62, SZ.fine, { edge: 0.2 });
      planePatch(c, [sx, y - 0.01, 0.63], [0.3, 0, 0], [0, 0.01, 0], q(900), B.mid * 0.9, SZ.base, { edge: 0.35 });
    }
    for (const y of [1.34, 1.76]) {
      for (let i = 0; i < 3; i++) {
        const bx = sx - 0.2 + i * 0.2;
        const bh = rand(0.08, 0.15);
        planePatch(c, [bx, y + bh / 2 + 0.01, 0.4], [0.075, 0, 0], [0, bh / 2, 0],
          q(1100), B.mid * 0.75, SZ.fine, { edge: 0.3 });
      }
    }
    // Uprights.
    for (const zz of [0.1, 0.6]) {
      planePatch(c, [sx, 1.0, zz], [0.02, 0, 0], [0, 1.0, 0], q(1400), B.mid * 0.7, SZ.base, { falloff: 0.3 });
    }
    // Crates.
    const crate = (x: number, z: number, w: number, h: number, d: number) => {
      planePatch(c, [x, h / 2, z - d], [w, 0, 0], [0, h / 2, 0], q(2400), B.mid * 0.6, SZ.fine, { edge: 0.24 });
      planePatch(c, [x, h, z], [w, 0, 0], [0, 0, d], q(1800), B.mid * 0.7, SZ.fine, { edge: 0.28 });
      planePatch(c, [x + w, h / 2, z], [0, 0, d], [0, h / 2, 0], q(1600), B.bg * 1.1, SZ.fine, { falloff: 0.25 });
    };
    crate(2.72, -0.62, 0.34, 0.42, 0.3);
    crate(-2.62, -1.32, 0.28, 0.3, 0.26);
  });

  // ---------- desk ----------
  steps.push(() => {
    const top: V3 = [0, 0.778, -0.12];
    // Top surface, dense: this is the brightest read plane in frame.
    planePatch(c, top, [0.85, 0, 0], [0, 0, 0.36], q(30000), B.obj, SZ.fine, {
      edge: 0.1, jitter: 0.0012,
    });
    // Front lip and side edges, crisp.
    planePatch(c, [0, 0.766, 0.24], [0.85, 0, 0], [0, 0.012, 0], q(6000), B.edge, SZ.bold, { edge: 0.3 });
    planePatch(c, [-0.85, 0.766, -0.12], [0, 0.012, 0], [0, 0, 0.36], q(1500), B.edge, SZ.bold, { edge: 0.3 });
    planePatch(c, [0.85, 0.766, -0.12], [0, 0.012, 0], [0, 0, 0.36], q(1500), B.edge, SZ.bold, { edge: 0.3 });
    // Underside, sparser — visible because the camera sits above.
    planePatch(c, [0, 0.754, -0.12], [0.85, 0, 0], [0, 0, 0.36], q(6000), B.mid, SZ.fine, { falloff: 0.35 });
    // Side panels instead of thin legs: reads more solidly at density.
    planePatch(c, [-0.8, 0.38, -0.14], [0, 0.38, 0], [0, 0, 0.3], q(4000), B.obj, SZ.fine, { edge: 0.16 });
    planePatch(c, [0.8, 0.38, -0.14], [0, 0.38, 0], [0, 0, 0.3], q(4000), B.obj, SZ.fine, { edge: 0.16 });
    // Modesty/cross bar at the back.
    planePatch(c, [0, 0.3, -0.42], [0.78, 0, 0], [0, 0.09, 0], q(2500), B.mid, SZ.fine, { edge: 0.2 });
  });

  // ---------- monitor ----------
  // LAYER ORDER, and it was inverted. The camera travels in +z and never
  // leaves the near side of the panel, so the near side is the side we see:
  // the screen and its code have to be the most-negative-z layers, with the
  // bezel a rim around them and the shell behind. Built the other way round
  // — screen face at -0.440, "back" shell at -0.462, and a FILLED bezel
  // patch of ~10k bright points at -0.452 — the camera was looking at the
  // back of the monitor through the bezel, and the screen only read at all
  // because every layer is sparse enough to see through. Any text drawn on
  // it disappeared completely.
  steps.push(() => {
    // Sits LOW and is a realistic 24" panel. At its first size it was a
    // 60cm slab whose top edge cleared the seated figure's shoulders,
    // so — once depth testing was on — it simply walled off the torso.
    // Head and shoulders now rise clear above it.
    const cy = 1.02;
    const hw = 0.265;
    const hh = 0.155;
    // Near to far, from the camera.
    const zRim = -0.4560;
    const zCode = -0.4545;
    const zWash = -0.4525;
    const zBack = -0.4300;

    // Dark glass: DENSE so it is opaque, DARK so it does not compete.
    // Those are independent here — brightness picks the colour in the
    // fragment shader and has nothing to do with alpha — so a near-black
    // plate still writes depth and still hides what is behind it. Sparse
    // and bright (7k at full B.screen, as it was first built) gets both
    // wrong at once: the panel's own speckle out-shouted anything drawn on
    // it, AND the figure two-thirds of a metre behind showed through the
    // gaps and tangled up with the text.
    //
    // Deliberately NOT FLAG.screen: that flag adds uScreenGlow on approach,
    // which would light this plate up to full brightness at exactly the
    // moment the code finally becomes legible over it.
    // Half-covered on purpose. Opacity here is COVERAGE — spacing versus
    // point size in PIXELS — and it does not vary with distance, since both
    // scale together. So there is no density that hides the figure on
    // arrival and stays discreet in the establishing shot: at 26k of
    // SZ.glyph this went fully opaque at every depth, and a fully opaque
    // plate cannot be made dark, because the fragment shader floors colour
    // at 58% of the accent no matter how low aBright goes. The result was a
    // pale violet slab pulling the eye off the figure in the opening frame.
    //
    // Partial coverage instead: enough grain to read as glass, and the
    // contrast is carried by the CODE being near-white rather than by the
    // panel being black.
    planePatch(c, [0, cy, zWash], [hw, 0, 0], [0, hh, 0], q(11000), B.bg * 0.55, SZ.base, {
      jitter: 0.0006,
    });
    // A faint glow layer that does carry the flag, so the panel warms as
    // the camera lands rather than only its text.
    planePatch(c, [0, cy, zWash - 0.0004], [hw, 0, 0], [0, hh, 0], q(1100), B.mid * 0.5, SZ.fine, {
      jitter: 0.0006, flag: FLAG.screen,
    });

    // Real scrolling output, not the row of fake scanlines this used to
    // carry. This is the payoff of the whole dolly: the camera flies into
    // this panel, so it is the one surface that ends up filling the frame.
    codeScreen(c, [
      '> DBT RUN --MODELS SALES',
      '  84 MODELS COMPILED OK',
      '  SALES.CEMEA_FCT 4.21M',
      '> PYTEST -Q',
      '  479 PASSED  0 FAILED',
      '> FIT LGBM  MAPE 0.94',
      '  DRIFT PSI 0.02 STABLE',
      '> DEPLOY PROD  P95 41MS',
    ], [0, cy, zCode], B.screen * 1.5);

    // Bezel as four strips rather than one filled patch, so it frames the
    // screen instead of covering it.
    const bw = 0.013;
    planePatch(c, [0, cy + hh + bw, zRim], [hw + bw * 2, 0, 0], [0, bw, 0], q(2600), B.edge, SZ.bold, { edge: 0.5 });
    planePatch(c, [0, cy - hh - bw, zRim], [hw + bw * 2, 0, 0], [0, bw, 0], q(2600), B.edge, SZ.bold, { edge: 0.5 });
    planePatch(c, [-(hw + bw), cy, zRim], [bw, 0, 0], [0, hh, 0], q(1600), B.edge, SZ.bold, { edge: 0.5 });
    planePatch(c, [hw + bw, cy, zRim], [bw, 0, 0], [0, hh, 0], q(1600), B.edge, SZ.bold, { edge: 0.5 });

    // Far face of the panel, plus neck and foot.
    planePatch(c, [0, cy, zBack], [hw, 0, 0], [0, hh, 0], q(3000), B.mid * 0.55, SZ.fine, { falloff: 0.35 });
    tubeShell(c, [0, 0.79, -0.442], [0, 0.878, -0.446], 0.028, 0.024, q(2200), B.obj, SZ.base, 0.04);
    discY(c, [0, 0.784, -0.442], 0.1, q(2000), B.obj, SZ.fine);
    ringY(c, [0, 0.787, -0.442], 0.1, 0.006, q(1000), B.edge, SZ.bold);
    // No backward tilt, unlike the first version: this panel carries
    // FLAG.code, and a pitched code screen sheds its own text as the block
    // scrolls (see codeScreen). A yaw would be safe; a pitch is not.
  });

  // ---------- keyboard, with individual keycaps ----------
  steps.push(() => {
    const kx = 0;
    const ky = 0.7885;
    const kz = -0.02;
    const halfW = 0.20;
    const halfD = 0.075;
    // Base plate.
    planePatch(c, [kx, ky, kz], [halfW, 0, 0], [0, 0, halfD], q(5000), B.obj, SZ.fine, { edge: 0.22 });
    planePatch(c, [kx, ky - 0.005, kz + halfD], [halfW, 0, 0], [0, 0.005, 0], q(1200), B.edge, SZ.bold, {});

    // Six rows with realistic unit widths (wide backspace, tab, caps,
    // shifts, spacebar). ~74 caps, each an edge-heavy patch — the
    // outlines are what make it legible as a keyboard.
    const rows: number[][] = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
      [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
      [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
      [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25],
    ];
    const rowD = (halfD * 2) / rows.length;
    rows.forEach((row, ri) => {
      const units = row.reduce((a, b) => a + b, 0);
      const unitW = (halfW * 2) / units;
      // Function row sits slightly shallower and lower.
      const shallow = ri === 0 ? 0.62 : 1;
      const zc = kz - halfD + rowD * (ri + 0.5);
      let x = kx - halfW;
      for (const u of row) {
        const w = u * unitW;
        const cxx = x + w / 2;
        planePatch(
          c,
          [cxx, ky + 0.004, zc],
          [Math.max(0.0016, w / 2 - 0.0018), 0, 0],
          [0, 0, Math.max(0.0016, (rowD * shallow) / 2 - 0.0018)],
          q(ri === 0 ? 62 : 100), B.edge, SZ.bold,
          { edge: 0.62, jitter: 0.0006 }
        );
        x += w;
      }
    });
  });

  // ---------- desk objects ----------
  steps.push(() => {
    // Mouse: rounded shell, open bottom. Parked under the right hand,
    // so the pose reads as one hand on the mouse rather than two hands
    // hovering beside a keyboard they aren't touching.
    ellipsoidShell(c, [0.31, 0.7885, 0.0], [0.032, 0.017, 0.052], q(2600), B.obj, SZ.fine, { yLo: -0.05 });
    // Mousepad.
    planePatch(c, [0.31, 0.7795, 0.0], [0.11, 0, 0], [0, 0, 0.085], q(2500), B.mid, SZ.fine, { edge: 0.3 });

    // Mug: wall, rim, base, handle.
    tubeShell(c, [-0.42, 0.782, -0.09], [-0.42, 0.877, -0.09], 0.041, 0.043, q(4000), B.obj, SZ.fine, 0.02);
    ringY(c, [-0.42, 0.877, -0.09], 0.043, 0.004, q(1400), B.edge, SZ.bold);
    discY(c, [-0.42, 0.784, -0.09], 0.04, q(700), B.mid, SZ.fine);
    for (let i = 0; i < q(1500); i++) {
      // Handle: a partial ring on the -x side.
      const th = rand(-1.25, 1.25);
      const ph = rand(0, TAU);
      const R = 0.036;
      const t = 0.007;
      c.push(
        -0.42 - Math.cos(th) * (R + Math.cos(ph) * t) - 0.03,
        0.83 + Math.sin(th) * (R + Math.cos(ph) * t),
        -0.09 + Math.sin(ph) * t,
        B.obj, SZ.base
      );
    }

    // Notebook + loose page, edge-lit.
    planePatch(c, [-0.19, 0.7885, 0.1], [0.1, 0, 0], [0, 0, 0.07], q(2600), B.obj, SZ.fine, { edge: 0.3 });
    planePatch(c, [-0.19, 0.7815, 0.1], [0.1, 0, 0], [0, 0.007, 0], q(1200), B.edge, SZ.bold, { edge: 0.4 });
    planePatch(c, [0.52, 0.7825, -0.05], [0.085, 0, 0], [0, 0, 0.115], q(2500), B.mid, SZ.fine, { edge: 0.35 });
    // Book stack, three slabs with crisp spines.
    for (let i = 0; i < 3; i++) {
      const y = 0.784 + i * 0.022;
      planePatch(c, [0.6, y, 0.13], [0.075, 0, 0], [0, 0, 0.105], q(1100), B.obj, SZ.fine, { edge: 0.25 });
      planePatch(c, [0.6, y - 0.009, 0.235], [0.075, 0, 0], [0, 0.009, 0], q(900), B.edge, SZ.bold, { edge: 0.4 });
    }
    // Pen.
    tubeShell(c, [-0.06, 0.7885, 0.16], [0.04, 0.7885, 0.185], 0.005, 0.004, q(800), B.edge, SZ.base, 0.06);
    // Phone, face down.
    planePatch(c, [-0.62, 0.7845, 0.06], [0.037, 0, 0], [0, 0, 0.075], q(1200), B.obj, SZ.fine, { edge: 0.45 });
  });

  // ---------- plant: gives the silhouette an asymmetric accent ----------
  steps.push(() => {
    tubeShell(c, [0.72, 0.782, -0.3], [0.72, 0.9, -0.3], 0.072, 0.058, q(3000), B.obj, SZ.fine, 0.02);
    ringY(c, [0.72, 0.9, -0.3], 0.058, 0.005, q(900), B.edge, SZ.bold);
    // Foliage as a jittered shell rather than individual blades. Drawn
    // as thin tapered spikes it read as a bright starburst / explosion
    // sitting on the desk; a loose irregular mass reads as a plant.
    ellipsoidShell(c, [0.72, 1.0, -0.3], [0.15, 0.13, 0.15], q(4000), B.obj, SZ.fine, {
      yLo: -0.5, jitter: 0.22,
    });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.3, 0.3);
      const reach = rand(0.09, 0.15);
      const h = rand(0.1, 0.2);
      const start = c.n;
      tubeShell(
        c, [0.72, 0.92, -0.3],
        [0.72 + Math.cos(a) * reach, 0.92 + h, -0.3 + Math.sin(a) * reach],
        0.022, 0.008, q(420), B.mid, SZ.fine, 0.2
      );
      // Bend each stem outward so they arc rather than spike.
      rotateRange(c, start, [0.72, 0.92, -0.3], [Math.sin(a), 0, -Math.cos(a)], rand(0.2, 0.5));
    }
  });

  // ---------- cables ----------
  steps.push(() => {
    cableSag(c, [0.06, 0.79, -0.47], [0.34, 0.012, -0.68], 0.1, 0.006, q(2200), B.mid, SZ.base);
    cableSag(c, [-0.1, 0.79, -0.47], [-0.5, 0.012, -0.6], 0.14, 0.005, q(2200), B.mid, SZ.base);
    cableSag(c, [0.34, 0.012, -0.68], [-0.5, 0.014, -0.62], 0.0, 0.005, q(1000), B.bg, SZ.base);
  });

  // ---------- chair ----------
  steps.push(() => {
    const seatZ = 0.44;
    // Seat pad: top, front edge, underside.
    planePatch(c, [0, 0.462, seatZ], [0.24, 0, 0], [0, 0, 0.24], q(7000), B.obj, SZ.fine, { edge: 0.14 });
    planePatch(c, [0, 0.45, seatZ - 0.24], [0.24, 0, 0], [0, 0.014, 0], q(2200), B.edge, SZ.bold, { edge: 0.3 });
    planePatch(c, [0, 0.44, seatZ], [0.24, 0, 0], [0, 0, 0.24], q(2400), B.mid, SZ.fine, { falloff: 0.4 });

    // Backrest: a perforated mesh panel. The holes are the detail that
    // makes it read as an office chair rather than a slab.
    const bstart = c.n;
    planePatch(c, [0, 0.94, 0.68], [0.25, 0, 0], [0, 0.3, 0], q(12000), B.obj, SZ.fine, {
      edge: 0.18,
      holes: (a, t) => {
        const u = (a * 0.5 + 0.5) * 22;
        const v = (t * 0.5 + 0.5) * 15;
        return u % 1 < 0.34 && v % 1 < 0.34;
      },
    });
    // Frame outline around the mesh.
    planePatch(c, [0, 0.94, 0.685], [0.262, 0, 0], [0, 0.315, 0], q(4200), B.edge, SZ.bold, { edge: 0.85 });
    rotateRange(c, bstart, [0, 0.64, 0.66], [1, 0, 0], 0.15); // recline

    // Armrests.
    tubeShell(c, [-0.27, 0.63, 0.3], [-0.27, 0.63, 0.6], 0.022, 0.022, q(2000), B.obj, SZ.fine, 0.03);
    tubeShell(c, [0.27, 0.63, 0.3], [0.27, 0.63, 0.6], 0.022, 0.022, q(2000), B.obj, SZ.fine, 0.03);
    tubeShell(c, [-0.27, 0.63, 0.56], [-0.25, 0.47, 0.62], 0.014, 0.014, q(700), B.mid, SZ.base, 0.05);
    tubeShell(c, [0.27, 0.63, 0.56], [0.25, 0.47, 0.62], 0.014, 0.014, q(700), B.mid, SZ.base, 0.05);

    // Gas cylinder and five-star base with casters.
    tubeShell(c, [0, 0.11, seatZ], [0, 0.44, seatZ], 0.036, 0.03, q(2000), B.obj, SZ.fine, 0.02);
    discY(c, [0, 0.1, seatZ], 0.05, q(600), B.mid, SZ.fine);
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + 0.35;
      const ex = Math.cos(a) * 0.3;
      const ez = Math.sin(a) * 0.3;
      tubeShell(c, [0, 0.1, seatZ], [ex, 0.055, seatZ + ez], 0.024, 0.014, q(1200), B.obj, SZ.fine, 0.04);
      ringY(c, [ex, 0.032, seatZ + ez], 0.028, 0.009, q(600), B.edge, SZ.base);
    }
  });

  // ---------- the person ----------
  // Not a body any more: a figure made of code. The loft rings from
  // before survive as the FORM the characters are arranged on — they
  // describe where he is without ever being rendered as a surface.
  //
  // Solidity is the whole design. It runs 1 at the shoulders and above,
  // falling to almost nothing by desk height, and it simultaneously
  // drives glyph density, brightness and how far each character drifts
  // off the form. So he is dense and solid where the hood and shoulders
  // are, and disperses into loose drifting characters lower down.
  //
  // NOTHING above the neck. The hood covers the head, and the opening has
  // to be genuinely empty: leave the skull rings clothed and their glyphs
  // show through the hole as a face made of characters, which is exactly
  // the read the hood exists to avoid. The taper has to be applied to both
  // passes, not just the first — the loose pass is driven by the inverse of
  // solidity, so zeroing solidity alone would make it *denser* up there.
  const underHood = (y: number) => 1 - clamp01((y - 1.412) / 0.048);
  const solidity = (y: number) => {
    const t = clamp01((y - 0.70) / (1.26 - 0.70));
    return underHood(y) * (0.16 + 0.84 * (t * t * (3 - 2 * t)));
  };

  steps.push(() => {
    // Torso and neck, clothed in code.
    glyphBody(c, BODY, 0.0125, B.skin, solidity, { rowGap: 0.040, colGap: 0.034, drift: 0.1 });
    // A second, looser pass that reads as characters shaking free of the
    // form — denser near the bottom where the body is coming apart.
    glyphBody(c, BODY, 0.0115, B.obj, (y) => underHood(y) * (0.62 - solidity(y) * 0.5), {
      rowGap: 0.062, colGap: 0.058, drift: 0.3,
    });
  });

  steps.push(() => {
    // The hood, up: the anchor the whole composition hangs on now that
    // there is no mask. Dense and bright where everything else about the
    // figure is dissolving.
    hood(c, q);
    hoodie(c, q);
  });

  steps.push(() => {
    // Arms, in code. Denser toward the hands so they still land
    // legibly on the desk — that gesture is most of what says "working".
    for (const sx of [-1, 1]) {
      const ARM = loftOf(armRings(sx));
      glyphBody(c, ARM, 0.0115, B.skin, (y) => Math.max(solidity(y), 0.7), { rowGap: 0.034, colGap: 0.030, drift: 0.05 });
      glyphBody(c, ARM, 0.011, B.obj, () => 0.3, { rowGap: 0.07, colGap: 0.065, drift: 0.2 });
    }
  });

  steps.push(() => {
    // Legs: almost entirely dissolved, a scatter of characters where a
    // lap and shins would be. Mostly hidden by the desk anyway, and the
    // downward dissolve is the point.
    for (const sx of [-1, 1]) {
      const LEG = loftOf(legRings(sx));
      glyphBody(c, LEG, 0.0115, B.obj, (y) => Math.min(0.45, solidity(y) + 0.18), { rowGap: 0.055, colGap: 0.05, drift: 0.13 });
    }
  });


  // ---------- floating terminal panels ----------
  // Beside and behind the figure, never in front of him: they are set
  // dressing, and the brief was for the subject to stay dominant.
  //
  // Dot pitch is the whole ballgame. At 0.0075m a character came out ~10
  // screen pixels wide and the type dissolved into speckle — the panels
  // read as noise, which wastes the entire point of building a font.
  // 0.017 puts a character at ~20px, which actually reads.
  //
  // Placement dodges two things: the top-left HUD readout (roughly
  // x < 300, y < 230 on screen), and the frame edges — an earlier set
  // was clipping off the top of the viewport.
  steps.push(() => {
    terminalPanel(c, [
      '> PIPELINE RUN',
      '  BIGQUERY   OK',
      '  ROWS  4.21M',
      '  ETL 00:03:41',
      '> MODEL FIT',
      '  MAPE   0.94',
      '  DEPLOY     OK',
    ], [-1.3, 1.1, 0.1], 0.017, B.obj * 1.3, 0.4, 2);

    terminalPanel(c, [
      '0X7F4A 0B12 CAFE',
      '0X00A3 FF01 4D2E',
      '0X91BC 22EF 7A05',
      '0XDEAD BEEF 1337',
      '0X4C6F 6164 2E2E',
    ], [1.36, 1.35, 0.1], 0.016, B.obj * 1.25, -0.44, 2);

    terminalPanel(c, [
      'AGENT LOOP ACTIVE',
      '01001101 01010010',
      'TOKENS 128K/200K',
      'LATENCY   41MS',
    ], [0.95, 1.95, 1.1], 0.0135, B.mid * 1.45, -0.55, 2);

    terminalPanel(c, [
      'SELECT * FROM',
      'SALES.CEMEA',
      'WHERE FY = 2026',
      '-- 4210331 ROWS',
    ], [1.2, 0.5, 0.8], 0.0142, B.mid * 1.45, -0.6, 2);
  });

  // ---------- data streams ----------
  // Curved paths carrying travelling pulses from the figure into the
  // screen. The points are static; only the pulse moves, in the shader.
  steps.push(() => {
    const screen: V3 = [0, 1.02, -0.44];
    const sources: V3[] = [
      [0, 1.6, 0.22],       // head
      [-0.31, 0.81, -0.03], // left hand
      [0.31, 0.81, -0.03],  // right hand
      [-0.16, 1.2, 0.18],   // chest
      [0.16, 1.2, 0.18],
      [0, 1.28, 0.2],
    ];
    sources.forEach((p0, si) => {
      // Control point flung out to the side and up, so each stream takes
      // a distinct arc instead of all six overlapping.
      const side = si % 2 === 0 ? 1 : -1;
      const ctrl: V3 = [
        p0[0] + side * rand(0.35, 0.6),
        Math.max(p0[1], 1.2) + rand(0.15, 0.45),
        (p0[2] + screen[2]) / 2 - rand(0.1, 0.3),
      ];
      const n = q(700);
      const phase = si / sources.length;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const mt = 1 - t;
        // Quadratic Bézier through the control point.
        const x = mt * mt * p0[0] + 2 * mt * t * ctrl[0] + t * t * screen[0];
        const y = mt * mt * p0[1] + 2 * mt * t * ctrl[1] + t * t * screen[1];
        const z = mt * mt * p0[2] + 2 * mt * t * ctrl[2] + t * t * screen[2];
        c.push(
          x + gauss() * 0.006, y + gauss() * 0.006, z + gauss() * 0.006,
          B.mid, SZ.base, FLAG.stream, (t + phase) % 1
        );
      }
    });
  });

  // ---------- scan artefacts ----------
  // These two go into the `soft` cloud, which renders with depth
  // WRITING off. They must be able to hide behind solid geometry but
  // must never occlude it — a dim mote that wrote depth would punch a
  // dark hole through the figure behind it.
  steps.push(() => {
    // Dropout haze: dim, slightly displaced echoes of points already in
    // the buffer. This is what real scan noise looks like — a fuzz that
    // follows the geometry — and it is nearly free, because it samples
    // the cloud rather than re-deriving any shape.
    const built = c.n;
    const n = q(15000);
    for (let i = 0; i < n; i++) {
      const j = (Math.random() * built) | 0;
      const k = j * 3;
      soft.push(
        c.pos[k] + gauss() * 0.019,
        c.pos[k + 1] + gauss() * 0.019,
        c.pos[k + 2] + gauss() * 0.019,
        B.dust, SZ.dust
      );
    }
  });

  steps.push(() => {
    // Ambient motes, bounded to the room's own volume so it reads as
    // dust in a room rather than a starfield the room floats in. Kept
    // below head height and sparse — filling the upper frame turned the
    // clean black background into grain.
    const n = q(13000);
    for (let i = 0; i < n; i++) {
      soft.push(rand(-2.4, 2.4), rand(0.02, 1.85), rand(-1.0, 1.6), B.dust * 0.8, SZ.dust);
    }
  });

  // ---------- orbiting swarm ----------
  // The "surrounded by stuff" layer. Motes on shells around the figure,
  // each with its own signed angular speed so they shear past one
  // another. In the soft pass: they must be hidden by the desk when they
  // pass behind it, but must never occlude the figure themselves.
  steps.push(() => {
    const cx = 0;
    const cz = 0.33;
    const n = q(15000);
    for (let i = 0; i < n; i++) {
      // Biased toward the outer shells, so the space right around him
      // stays readable.
      const r = 0.5 + Math.sqrt(Math.random()) * 0.95;
      const a = rand(0, TAU);
      const y = 1.02 + gauss() * 0.42;
      if (y < 0.05) continue;
      const speed = (0.045 + Math.random() * 0.15) * (Math.random() < 0.5 ? -1 : 1);
      soft.push(
        cx + Math.cos(a) * r, y, cz + Math.sin(a) * r,
        B.dust * 1.15, SZ.dust, FLAG.orbit, speed
      );
    }
    // A handful of larger, brighter fragments among them.
    for (let k = 0; k < q(90); k++) {
      const r = 0.6 + Math.random() * 0.9;
      const a = rand(0, TAU);
      const y = 1.02 + gauss() * 0.4;
      const speed = (0.04 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1);
      const fx = cx + Math.cos(a) * r;
      const fz = cz + Math.sin(a) * r;
      for (let i = 0; i < 26; i++) {
        soft.push(
          fx + gauss() * 0.012, y + gauss() * 0.012, fz + gauss() * 0.012,
          B.mid, SZ.base, FLAG.orbit, speed
        );
      }
    }
  });

  // ---------- space beyond the window ----------
  steps.push(() => {
    // A broad SLAB of stars, not a sphere shell. The shell version put
    // almost nothing inside the narrow cone the window actually
    // subtends — nearly every star landed off to the sides or behind the
    // camera, and the aperture just read black. A slab spanning the
    // whole opening guarantees the window is full.
    //
    // Flagged sky so depth fog leaves them alone: at 7–15m out the fog
    // curve would erase them completely.
    const n = q(26000);
    for (let i = 0; i < n; i++) {
      const hot = Math.random() < 0.06;
      soft.push(
        rand(-14, 14), rand(-3, 11), rand(7, 15),
        hot ? B.edge * 0.95 : B.dust * rand(0.55, 1.15),
        hot ? SZ.base : SZ.dust,
        FLAG.sky
      );
    }
    // Two loose nebula banks in the same volume, so they read through
    // the aperture as depth rather than wrapping the whole room.
    for (let k = 0; k < 2; k++) {
      const nx = rand(-4.5, 4.5);
      const ny = rand(1.2, 5.5);
      const nz = rand(8, 13);
      for (let i = 0; i < q(4500); i++) {
        soft.push(
          nx + gauss() * 2.4, ny + gauss() * 1.5, nz + gauss() * 1.6,
          B.dust * 0.5, SZ.dust, FLAG.sky
        );
      }
    }
  });

  // ---------- re-centre, once, at the very end ----------
  steps.push(() => {
    const m = new THREE.Matrix4().makeTranslation(-CENTER.x, -CENTER.y, -CENTER.z);
    transformRange(c, 0, m);
    transformRange(soft, 0, m);
  });

  return steps;
}

// ============================================================
//  shaders
// ============================================================

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;       // px per world-unit at unit depth
  uniform float uSizeScale;
  uniform float uReveal;      // 0..1 scan-in sweep
  uniform vec2  uRevealY;     // cloud min/max Y
  uniform float uFogNear;
  uniform float uFogFar;
  uniform float uOpacity;
  uniform float uScreenGlow;
  uniform vec3  uOrbitCenter;
  uniform vec2  uCodeBand;    // (block height in world units, scroll speed)

  attribute float aSeed;
  attribute float aBright;
  attribute float aSize;
  attribute float aFlag;
  attribute float aParam;

  varying float vAlpha;
  varying float vBright;
  varying float vFog;

  void main() {
    // Behaviour masks rather than branches, so every point walks the
    // same instruction path regardless of its flag.
    float isScreen = step(0.5, aFlag) * step(aFlag, 1.5);
    float isOrbit  = step(1.5, aFlag) * step(aFlag, 2.5);
    float isStream = step(2.5, aFlag) * step(aFlag, 3.5);
    float isGlyph  = step(3.5, aFlag) * step(aFlag, 4.5);
    float isSky    = step(4.5, aFlag) * step(aFlag, 5.5);
    float isCode   = step(5.5, aFlag) * step(aFlag, 6.5);

    vec3 pos = position;

    // ---- scrolling code: text runs UP the screen, as a terminal does.
    // aParam is this dot's normalised height in its block, so the block's
    // bottom edge is just y - aParam * H, which means one uniform scrolls
    // every screen without storing a band per point. (No backticks in
    // here: this whole shader is a template literal, and one would end it.)
    float codeV = fract(aParam + uTime * uCodeBand.y);
    float codeY = (pos.y - aParam * uCodeBand.x) + codeV * uCodeBand.x;
    pos.y = mix(pos.y, codeY, isCode);

    // ---- swarm: rotate about a vertical axis through the figure.
    // aParam is a signed angular speed, so motes at different radii and
    // directions shear past each other and read as a swarm rather than
    // one rigid ring. Zero for everything else, which makes this an
    // identity rotation — no branch needed.
    float oa = uTime * aParam * isOrbit;
    vec2 rel = pos.xz - uOrbitCenter.xz;
    float oc = cos(oa);
    float os = sin(oa);
    pos.xz = uOrbitCenter.xz + vec2(rel.x * oc - rel.y * os, rel.x * os + rel.y * oc);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float depth = -mv.z;

    float base = aBright;

    // ---- scan-in: a soft wavefront sweeping bottom to top, with the
    // leading edge burning brighter, like a LiDAR pass completing.
    float span = (uRevealY.y - uRevealY.x);
    float front = mix(uRevealY.x - span * 0.08, uRevealY.y + span * 0.08, uReveal);
    float d = front - position.y;
    float revealed = smoothstep(0.0, span * 0.1, d);
    float crest = exp(-abs(d) * 26.0 / max(span, 0.001)) * 1.9;

    // The sky sits far above the room, so the sweep's wavefront never
    // reaches it — stars would simply never appear. They get their own
    // plain fade against the same clock instead.
    revealed = mix(revealed, smoothstep(0.0, 0.75, uReveal), isSky);
    crest *= 1.0 - isSky;

    // ---- sensor shimmer: slow per-point brightness breathing. Floor
    // kept high so points stay solid — the reference cloud is opaque,
    // and deep shimmer reads as a dying screen rather than as grain.
    float shim = 0.88 + 0.12 * sin(uTime * (1.3 + aSeed * 2.2) + aSeed * 40.0);

    // ---- dropout: a few percent of points blink out each tick. Held
    // per-quantised-time-step so points stay out long enough to read.
    float tick = floor(uTime * 2.4);
    float n = fract(sin(aSeed * 913.7 + tick * 0.371) * 43758.5453);
    float alive = step(0.045, n);

    // ---- data streams: a bright pulse runs the length of each path.
    // aParam is the point's position along its own path, so comparing it
    // to a wrapped clock gives a travelling head with a fading tail.
    float head = fract(uTime * 0.34);
    float along = fract(aParam - head + 1.0);
    float pulse = exp(-along * 13.0);

    // ---- terminal glyphs: whole characters blink, never single dots,
    // because aParam is shared across every dot of one glyph. A dot-wise
    // flicker would just shred the text into noise.
    float gtick = floor(uTime * 3.0);
    float grand = fract(sin(aParam * 421.7 + gtick * 0.137) * 43758.5453);

    // ---- depth fog toward black, so the room has real depth. The sky
    // is exempt: stars sit ~14m out, where fog would erase them.
    vFog = mix(1.0 - smoothstep(uFogNear, uFogFar, depth), 1.0, isSky);

    // The screen blooms as the camera closes on it, so it sits quiet in
    // the establishing frame and becomes the payoff on arrival. The code
    // on it blooms too, a little less, or the text washes out into the
    // backlight exactly when it finally becomes legible.
    vBright = base + crest
      + isScreen * uScreenGlow
      + isCode * uScreenGlow * 0.72
      // Freshly-printed rows burn brighter as they come in at the bottom.
      + isCode * (0.16 + 0.5 * exp(-codeV * 5.0))
      + isStream * pulse * 1.5
      + isGlyph * step(0.88, grand) * 0.55;

    // Deliberately NOT multiplied by fog: fog darkens the colour
    // instead. Folding it into alpha as well made distant geometry
    // washed-out grey rather than deep violet fading to black.
    vAlpha = uOpacity * revealed * alive * shim
      // Stream paths stay faintly visible between pulses.
      * mix(1.0, 0.22 + pulse * 0.78, isStream)
      // A glyph drops out entirely now and then, like a bad refresh.
      * mix(1.0, step(0.18, grand), isGlyph)
      // Code fades in at the bottom edge and out at the top, which is
      // what hides the seam where a row wraps around the block.
      * mix(1.0, smoothstep(0.0, 0.05, codeV) * (1.0 - smoothstep(0.92, 1.0, codeV)), isCode);

    gl_Position = projectionMatrix * mv;

    float px = aSize * uSizeScale * uScale / max(depth, 0.02);
    // Floor keeps distant grain from vanishing entirely (that is what
    // holds the dense look at range); ceiling stops near points from
    // turning into blobs on arrival.
    gl_PointSize = clamp(px * (1.0 + crest * 0.35), 0.85, 5.0);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3 uColor;
  uniform vec3 uHot;

  varying float vAlpha;
  varying float vBright;
  varying float vFog;

  void main() {
    // Round, softly-edged point. Cheaper than a texture lookup.
    vec2 d = gl_PointCoord - 0.5;
    float r2 = dot(d, d);
    if (r2 > 0.25) discard;
    float soft = 1.0 - smoothstep(0.02, 0.25, r2);

    vec3 c = mix(uColor, uHot, clamp((vBright - 1.15) * 0.6, 0.0, 1.0));
    c *= mix(0.58, 1.0, clamp(vBright, 0.0, 1.5)) * mix(0.32, 1.0, vFog);

    float a = soft * vAlpha;
    // Depth writing is on for the solid pass, so a nearly-invisible
    // fragment must be thrown away rather than blended — otherwise it
    // still stamps the depth buffer and silently occludes whatever is
    // behind it.
    if (a < 0.1) discard;

    gl_FragColor = vec4(c, a);
  }
`;

// ============================================================
//  boot
// ============================================================

function boot(wrap: HTMLElement, canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  // Both point passes hang off one group, so the sway rotates them
  // together — the dropout haze is derived from the solid geometry's
  // positions and would visibly detach if the two spun separately.
  const group = new THREE.Group();
  scene.add(group);
  const FOV = 45;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 40);

  const css = getComputedStyle(document.documentElement);
  const accent = css.getPropertyValue('--color-primary-on-dark').trim() || '#a78bfa';

  const uniforms = {
    uTime: { value: 0 },
    uScale: { value: 600 },
    uSizeScale: { value: 1 },
    uReveal: { value: 0 },
    uRevealY: { value: new THREE.Vector2(-1, 1) },
    // Fog starts beyond the subject, so the figure keeps the full violet
    // and only the room behind it falls away. Pulled in tighter the
    // figure itself went washed-out blue-grey.
    uFogNear: { value: 2.4 },
    uFogFar: { value: 7.5 },
    uOpacity: { value: 1 },
    uScreenGlow: { value: 0 },
    // Vertical axis the swarm turns about — through the figure, not the
    // tableau's centre, which sits a little in front of him.
    uOrbitCenter: { value: new THREE.Vector3(0, 0, 0.33).sub(CENTER) },
    // Height of one screen's worth of code rows, and the scroll rate.
    // Centring-invariant: the shader only ever uses the difference
    // between a point's y and its block's bottom.
    uCodeBand: { value: new THREE.Vector2(CODE.h, CODE.speed) },
    uColor: { value: new THREE.Color(accent) },
    uHot: { value: new THREE.Color('#efe7ff') },
  };

  // Two materials over ONE shared uniforms object, so the per-frame
  // uniform writes below update both passes at once.
  //
  // Depth testing is ON, unlike the previous version. A real scan
  // occludes itself — the front of the torso hides the chair behind it
  // — and without it every background plane drew straight through the
  // figure (the chair backrest was crossing the person's chest). The
  // reference cloud is opaque and depth-tested for exactly this reason.
  const shared = {
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    // Alpha blended, not additive: at ~500k points additive saturates
    // the whole figure to white.
    blending: THREE.NormalBlending,
    depthTest: true,
  };
  const material = new THREE.ShaderMaterial({ ...shared, depthWrite: true });
  const softMaterial = new THREE.ShaderMaterial({ ...shared, depthWrite: false });

  // ---------- camera path (authored in room space, centred once) ----------
  // The camera stays on the monitor's side of the desk the whole time —
  // the side the person faces — so the opening frame is the front of
  // the figure, never the chair back. Scrolling pulls it along roughly
  // the same line, ending at the screen surface.
  //
  // START sits ~2.7m out, framing the figure at roughly 70% of frame
  // height, and only slightly off-axis. Both numbers are doing real
  // compositional work: at 2m the 45° frustum could not fit the
  // tableau, and a large x-offset threw the near monitor hard right
  // while pushing the far chair left, splitting one scene into two
  // floating quads. Nearly frontal keeps the tableau coherent — the
  // reference sits at only about -5° of azimuth for the same reason.
  const START = new THREE.Vector3(0.22, 1.46, -2.6).sub(CENTER);
  // Stops just short of the panel, on the camera's own side of it. The
  // camera travels in +z (from z ≈ -2.6 toward the screen at z = -0.44),
  // so "just short" is MORE negative, not less — and 8cm out is the
  // sweet spot: the screen fills the frame, and any closer it crosses
  // the near plane and clips to nothing exactly as the veil takes over.
  const END = new THREE.Vector3(0, 1.02, -0.52).sub(CENTER);
  // The aim point travels too — from the figure to a point beyond the
  // screen, further along the direction of travel — so the camera swings
  // to face the panel dead-on as it arrives. Putting this behind the
  // camera instead spun it around to stare into empty space.
  const LOOK = new THREE.Vector3(0, 1.0, 0.12).sub(CENTER);
  const LOOK_END = new THREE.Vector3(0, 1.02, 0.3).sub(CENTER);
  const lookAt = new THREE.Vector3();
  camera.position.copy(START);
  camera.lookAt(LOOK);

  // ---------- progressive build ----------
  // The scene is defined as a list of steps consumed under a per-frame
  // time budget. Generating half a million points in one synchronous
  // pass is a ~70ms long task landing right in the middle of page load;
  // this keeps every frame short and the main thread responsive.
  const cloud = new Cloud(Math.round(500000 * QUALITY));
  const softCloud = new Cloud(Math.round(80000 * QUALITY));
  const steps = buildSteps(cloud, softCloud);
  let step = 0;
  let ready = false;

  function buildChunk() {
    const t0 = performance.now();
    while (step < steps.length && performance.now() - t0 < 8) {
      steps[step++]();
    }
    if (step < steps.length) {
      requestAnimationFrame(buildChunk);
      return;
    }
    finish();
  }

  function finish() {
    /** Binds a Cloud's filled region as geometry attributes. */
    const geomFor = (c: Cloud) => {
      const n = c.n;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(c.pos.subarray(0, n * 3), 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(c.seed.subarray(0, n), 1));
      g.setAttribute('aBright', new THREE.BufferAttribute(c.bright.subarray(0, n), 1));
      g.setAttribute('aSize', new THREE.BufferAttribute(c.size.subarray(0, n), 1));
      g.setAttribute('aFlag', new THREE.BufferAttribute(c.flag.subarray(0, n), 1));
      g.setAttribute('aParam', new THREE.BufferAttribute(c.param.subarray(0, n), 1));
      return g;
    };

    // Exact reveal bounds, measured after every transform has been
    // applied — the tilts and the final centring both move points.
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < cloud.n; i++) {
      const y = cloud.pos[i * 3 + 1];
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    uniforms.uRevealY.value.set(minY, maxY);

    // Frustum culling off: these always fill the view, so the per-frame
    // bounding-sphere test buys nothing.
    const solid = new THREE.Points(geomFor(cloud), material);
    solid.frustumCulled = false;
    group.add(solid);

    // Drawn after the solid pass so it depth-tests against a fully
    // written depth buffer.
    const softPoints = new THREE.Points(geomFor(softCloud), softMaterial);
    softPoints.frustumCulled = false;
    softPoints.renderOrder = 1;
    group.add(softPoints);

    ready = true;
    canvas.classList.add('is-ready');
    revealStart = performance.now();
    if (visible) start();
  }

  // ---------- sizing ----------
  function resize() {
    const w = wrap.clientWidth || innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Point size in pixels must track the drawing buffer, not CSS
    // pixels, or grain gets coarser on hi-DPI screens.
    uniforms.uScale.value = (h * dpr) / (2 * Math.tan((FOV * Math.PI) / 360));
  }
  resize();
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });

  // ---------- pointer parallax ----------
  // Fine pointers only: on touch there is no hover, and reading a
  // coarse pointer would fight the scroll.
  const wantsParallax = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let pointerX = 0;
  let pointerY = 0;
  if (wantsParallax) {
    addEventListener('pointermove', (e) => {
      pointerX = (e.clientX / innerWidth) * 2 - 1;
      pointerY = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  let parX = 0;
  let parY = 0;

  // ---------- scroll progress, spring-smoothed ----------
  let p = 0;
  let vel = 0;
  let revealStart = 0;

  const SWAY = 0.25;        // ±14° — clamped, so the figure never turns its back
  const SWAY_SPEED = 0.17;
  const PAR_AZ = 0.16;      // ±9° pointer azimuth
  const PAR_POL = 0.07;

  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3();

  function readProgress(): number {
    const r = wrap.getBoundingClientRect();
    const total = r.height - innerHeight;
    return total > 0 ? -r.top / total : 0;
  }
  /** Hermite ramp between two edges — the CSS/GLSL smoothstep. */
  const smoothstep01 = (a: number, b: number, v: number) => {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  let running = false;
  let raf = 0;
  let last = performance.now();
  // The build finishes asynchronously, so it needs to know whether the
  // section is actually on screen before kicking off the render loop —
  // otherwise a visitor who scrolled straight past still pays for it.
  let visible = true;

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    uniforms.uTime.value = now / 1000;

    // Scan-in over 1.6s, eased.
    const rt = clamp01((now - revealStart) / 1600);
    uniforms.uReveal.value = rt * rt * (3 - 2 * rt);

    // Critically-damped spring on scroll. A plain exponential lerp
    // still snaps on the first frame after a wheel burst; a spring is
    // C1-continuous, which is what makes the dolly feel like one glide.
    const target = clamp01(readProgress());
    const omega = 2 * Math.PI * 1.5;
    vel += (omega * omega * (target - p) - 2 * omega * vel) * dt;
    p += vel * dt;

    if (ready) {
      // Slow clamped sway instead of a full turntable: a visitor only
      // sees a few seconds of this, and a bounded sway guarantees the
      // opening frame is always the readable front view.
      group.rotation.y = SWAY * Math.sin(uniforms.uTime.value * SWAY_SPEED);
    }

    // Dolly, then orbit the pointer offset around the aim point, which
    // is itself travelling toward the screen.
    camera.position.lerpVectors(START, END, p * p);
    lookAt.lerpVectors(LOOK, LOOK_END, smoothstep01(0.15, 1, p));

    // Parallax authority fades out on approach — the radius to the
    // target goes to zero at the screen, so a constant angle would
    // whip the camera around at the end.
    const authority = 1 - p;
    parX += (pointerX * PAR_AZ * authority - parX) * Math.min(1, dt * 2.4);
    parY += (pointerY * PAR_POL * authority - parY) * Math.min(1, dt * 2.4);

    offset.copy(camera.position).sub(lookAt);
    spherical.setFromVector3(offset);
    spherical.theta += parX;
    spherical.phi = Math.max(0.25, Math.min(Math.PI - 0.25, spherical.phi + parY));
    offset.setFromSpherical(spherical);
    camera.position.copy(lookAt).add(offset);
    camera.lookAt(lookAt);

    // Hand off to the violet veil at the very end.
    uniforms.uOpacity.value = 1 - Math.max(0, p - 0.9) * 10;
    // Screen bloom, held back until the approach is underway.
    uniforms.uScreenGlow.value = smoothstep01(0.3, 0.95, p) * 1.15;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || !ready) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  document.addEventListener('visibilitychange', () => (document.hidden || !visible ? stop() : start()));
  new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    }),
    { threshold: 0 }
  ).observe(wrap);

  requestAnimationFrame(buildChunk);
}

// ============================================================
//  bootstrap — must stay last (see the note beside the queries above)
// ============================================================

if (wrap && canvas && !reduced) {
  try {
    boot(wrap, canvas);
  } catch {
    // WebGL unavailable, context creation failed, shader compile
    // rejected — the static CSS fallback (.itm-fallback) is already in
    // the markup and visible behind us.
    canvas.style.display = 'none';
  }
}
