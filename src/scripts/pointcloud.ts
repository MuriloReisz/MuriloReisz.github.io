// ============================================================
//  pointcloud.ts — the "into the machine" cold-open scene.
//  A procedural point cloud (no real 3D scan — a coded impression
//  of a person at a desk) rendered with Three.js: it auto-rotates
//  continuously, and scrolling through .itm-wrap dollies the camera
//  toward the monitor while a violet veil fades in, so the visitor
//  appears to fly through the screen into the real hero underneath.
//
//  Loaded only from IntoTheMachine.astro (component-scoped <script>),
//  so Three.js never ships on pages that don't render this section.
//  Bails out cleanly (leaves the CSS fallback visible) if WebGL is
//  unavailable or the user prefers reduced motion.
// ============================================================
import * as THREE from 'three';

const wrap = document.querySelector<HTMLElement>('.itm-wrap');
const canvas = document.querySelector<HTMLCanvasElement>('.itm-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (wrap && canvas && !reduced) {
  try {
    boot(wrap, canvas);
  } catch {
    // WebGL unavailable, context creation failed, etc. — the static
    // CSS fallback (.itm-fallback) is already in the markup and visible.
    canvas.style.display = 'none';
  }
}

function boot(wrap: HTMLElement, canvas: HTMLCanvasElement) {
  // alpha:true + a transparent clear colour so the DOM stat readout
  // sitting behind the canvas (z-index 0, in .itm-stage) shows through
  // in the gaps between points — an opaque canvas would just paint
  // over it.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);

  // ---------- procedural point cloud: a person at a desk ----------
  // Coordinates are authored in "room space" (desk ~0.78m high, person
  // seated behind it) then re-centred so the whole tableau spins in
  // place around its own visual centre rather than orbiting a corner.
  const CENTER = new THREE.Vector3(0, 1.0, 0.05);
  const positions: number[] = [];

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function addBox(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, count: number) {
    for (let i = 0; i < count; i++) {
      positions.push(
        cx + rand(-hx, hx) - CENTER.x,
        cy + rand(-hy, hy) - CENTER.y,
        cz + rand(-hz, hz) - CENTER.z
      );
    }
  }

  function addEllipsoid(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, count: number) {
    for (let i = 0; i < count; i++) {
      // Uniform-ish fill: random direction * cube-root(random radius).
      const theta = rand(0, Math.PI * 2);
      const phi = Math.acos(rand(-1, 1));
      const r = Math.cbrt(Math.random());
      const sx = r * Math.sin(phi) * Math.cos(theta);
      const sy = r * Math.sin(phi) * Math.sin(theta);
      const sz = r * Math.cos(phi);
      positions.push(cx + sx * rx - CENTER.x, cy + sy * ry - CENTER.y, cz + sz * rz - CENTER.z);
    }
  }

  function addCapsule(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, radius: number, count: number) {
    for (let i = 0; i < count; i++) {
      const t = Math.random();
      const theta = rand(0, Math.PI * 2);
      const r = radius * Math.sqrt(Math.random());
      // A perpendicular-ish offset is enough for a loose limb silhouette —
      // this never needs to be geometrically exact.
      positions.push(
        x0 + (x1 - x0) * t + Math.cos(theta) * r - CENTER.x,
        y0 + (y1 - y0) * t + Math.sin(theta) * r * 0.6 - CENTER.y,
        z0 + (z1 - z0) * t + Math.sin(theta) * r - CENTER.z
      );
    }
  }

  // Desk
  addBox(0, 0.76, -0.1, 0.8, 0.025, 0.36, 7000);
  addBox(-0.7, 0.38, -0.38, 0.03, 0.38, 0.03, 1100);
  addBox(0.7, 0.38, -0.38, 0.03, 0.38, 0.03, 1100);
  // Monitor + stand
  addBox(0, 1.06, -0.4, 0.28, 0.17, 0.02, 3600);
  addBox(0, 0.85, -0.4, 0.025, 0.09, 0.025, 700);
  // Keyboard + mouse
  addBox(0, 0.785, 0.05, 0.18, 0.01, 0.07, 1700);
  addBox(0.24, 0.777, 0.06, 0.025, 0.008, 0.035, 260);
  // Mug
  addEllipsoid(-0.34, 0.82, -0.1, 0.035, 0.05, 0.035, 380);
  // Papers / book stack
  addBox(-0.32, 0.785, 0.04, 0.1, 0.014, 0.13, 700);
  addBox(-0.31, 0.8, 0.03, 0.09, 0.011, 0.12, 500);
  // Cables trailing off the back of the desk toward the floor
  addCapsule(0.08, 0.83, -0.42, 0.18, 0.04, -0.44, 0.012, 320);
  addCapsule(-0.14, 0.83, -0.42, -0.34, 0.02, -0.5, 0.012, 320);
  // Chair
  addBox(0, 0.56, 0.36, 0.25, 0.03, 0.25, 3000);
  addBox(0, 0.92, 0.6, 0.25, 0.26, 0.025, 3800);
  addBox(-0.2, 0.28, 0.2, 0.02, 0.28, 0.02, 500);
  addBox(0.2, 0.28, 0.2, 0.02, 0.28, 0.02, 500);
  addBox(-0.2, 0.28, 0.5, 0.02, 0.28, 0.02, 500);
  addBox(0.2, 0.28, 0.5, 0.02, 0.28, 0.02, 500);
  // Person — a slight forward lean (head/shoulders sit a touch further
  // toward the desk than the hips) reads as "hunched over typing"
  // rather than sitting bolt upright.
  addEllipsoid(0, 1.53, 0.22, 0.13, 0.15, 0.13, 4200);
  addEllipsoid(0, 1.14, 0.3, 0.21, 0.3, 0.16, 8200);
  // Upper arms angle in from the shoulders toward the desk...
  addCapsule(-0.22, 1.3, 0.3, -0.16, 0.86, 0.14, 0.065, 2200);
  addCapsule(0.22, 1.3, 0.3, 0.16, 0.86, 0.14, 0.065, 2200);
  // ...and meet as one flat bar of forearms/hands resting on the desk —
  // the clean rectangular gap this leaves under the torso is the single
  // most recognisable cue in the reference silhouette.
  addBox(0, 0.825, 0.1, 0.19, 0.035, 0.09, 2600);
  addEllipsoid(0, 0.72, 0.38, 0.2, 0.1, 0.24, 2600);
  // Floor and back wall — without these the figure reads as floating in
  // a void; a thin, wide slab at floor level and a vertical slab behind
  // the monitor are enough to imply an actual room.
  addBox(0, 0, -1.0, 3.2, 0.012, 3.0, 5200);
  addBox(0, 1.9, -2.25, 3.2, 1.9, 0.012, 4200);
  // Close-in scan noise — a loose haze hugging the tableau itself,
  // echoing a real depth scan's dropout artifacts.
  for (let i = 0; i < 6000; i++) {
    const theta = rand(0, Math.PI * 2);
    const r = rand(0.3, 1.55);
    const y = rand(-1.0, 0.9);
    positions.push(
      Math.cos(theta) * r,
      y,
      Math.sin(theta) * r * 0.6 - CENTER.z + 0.05
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--color-primary-on-dark').trim() || '#a78bfa';
  const material = new THREE.PointsMaterial({
    color: new THREE.Color(accent),
    size: 0.0034,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const cloud = new THREE.Points(geometry, material);
  scene.add(cloud);

  // ---------- ambient dust — bounded to the room's own volume (between
  // the floor and a loose ceiling height, and between the back wall and
  // the front of the desk) so it reads as dust suspended in a room, not
  // an open starfield the room is floating in. ----------
  // Bounds are already authored directly in centred space (floor sits
  // at centred y = -1, the back wall at centred z ≈ -2.3), so no extra
  // CENTER offset here — these numbers are the room, not room-space.
  const starCount = 12000;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = rand(-3.3, 3.3);
    starPositions[i * 3 + 1] = rand(-0.95, 2.6);
    starPositions[i * 3 + 2] = rand(-2.25, 1.4);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const starMaterial = new THREE.PointsMaterial({
    color: new THREE.Color(accent),
    size: 0.003,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // Camera stays on the monitor's side of the desk the whole time — the
  // side the person actually faces — so the opening frame is always the
  // front of the figure, never the chair back. Scrolling only pulls the
  // camera closer along roughly the same line, ending almost at the
  // screen surface. (Both authored in room space, then re-centred like
  // every point above — mixing centred and un-centred vectors was the
  // earlier bug that put the start position behind the chair.)
  const START = new THREE.Vector3(0.95, 1.42, -1.35).sub(CENTER);
  const monitorCenter = new THREE.Vector3(0, 1.06, -0.4).sub(CENTER);
  const END = monitorCenter.clone().add(new THREE.Vector3(0, 0, 0.05));
  const LOOK = new THREE.Vector3(0, 1.22, 0.05).sub(CENTER);
  camera.position.copy(START);
  camera.lookAt(LOOK);

  // ---------- sizing ----------
  function resize() {
    const w = wrap.clientWidth || innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  });

  // ---------- render loop, gated by visibility + intersection ----------
  let running = false;
  let raf = 0;
  let last = performance.now();
  let smoothP = 0;

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    cloud.rotation.y += dt * 0.16;
    stars.rotation.y += dt * 0.03;

    const target = clamp01(readProgress());
    // Exponential smoothing decouples the camera dolly from raw scroll
    // deltas (mouse wheel / trackpad jitter), so it reads as one
    // continuous glide rather than snapping frame to frame.
    smoothP += (target - smoothP) * Math.min(1, dt * 5);

    camera.position.lerpVectors(START, END, easeInQuad(smoothP));
    camera.lookAt(LOOK);
    const fade = 1 - Math.max(0, smoothP - 0.9) * 10;
    material.opacity = 0.95 * fade;
    starMaterial.opacity = 0.28 * fade;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function readProgress(): number {
    const total = wrap.getBoundingClientRect().height - innerHeight;
    const scrolled = -wrap.getBoundingClientRect().top;
    return total > 0 ? scrolled / total : 0;
  }
  function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeInQuad(v: number) { return v * v; }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0 }).observe(wrap);

  canvas.classList.add('is-ready');
  start();
}
