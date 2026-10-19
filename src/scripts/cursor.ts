// ---------------------------------------------------------------------------
// cursor.ts — a lagging HUD ring that follows the pointer.
//
// The native cursor stays; this adds a thin ring that trails it and opens
// into corner brackets over anything interactive, which ties the pointer to
// the site's readout language. Fine pointers only, never under reduced
// motion, and it costs one transform per frame.
// ---------------------------------------------------------------------------
import { prefersReduced } from './dom';

const fine = matchMedia('(hover: hover) and (pointer: fine)');
if (fine.matches && !prefersReduced()) {
  const ring = document.createElement('div');
  ring.className = 'hud-cursor';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  let tx = -100;
  let ty = -100;
  let x = tx;
  let y = ty;
  let shown = false;
  let raf = 0;

  const frame = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    ring.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(frame) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!shown) { shown = true; ring.classList.add('is-on'); x = tx; y = ty; }
    const over = (e.target as Element | null)?.closest?.('a, button, [role="button"], input, select, textarea, label, summary');
    ring.classList.toggle('is-link', !!over);
    kick();
  }, { passive: true });
  addEventListener('pointerdown', () => ring.classList.add('is-down'), { passive: true });
  addEventListener('pointerup', () => ring.classList.remove('is-down'), { passive: true });
  document.addEventListener('pointerleave', () => ring.classList.remove('is-on'));
  document.addEventListener('pointerenter', () => { if (shown) ring.classList.add('is-on'); });
}
