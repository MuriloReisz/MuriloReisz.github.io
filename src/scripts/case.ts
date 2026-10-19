// ---------------------------------------------------------------------------
// case.ts — the small amount of behaviour the case-study page adds on top of
// motion.ts / widgets.ts: the agent-trace replay. Loaded only by
// /work/[slug] (a <script src>, so it never touches the CSP hash list).
// ---------------------------------------------------------------------------
import { prefersReduced } from './dom';

document.querySelectorAll<HTMLElement>('[data-trace]').forEach((term) => {
  const lines = Array.from(term.querySelectorAll<HTMLElement>('.trace__line'));
  const replay = term.querySelector<HTMLButtonElement>('[data-trace-replay]');
  let timers: number[] = [];

  const clear = () => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };
  const play = () => {
    clear();
    lines.forEach((l) => l.classList.remove('is-in'));
    if (prefersReduced()) {
      lines.forEach((l) => l.classList.add('is-in'));
      return;
    }
    /* Force the removal to paint before re-adding, or a replay would not
       re-run the transition on lines that were already in. */
    void term.offsetWidth;
    lines.forEach((l, i) => {
      /* Sub-lines follow their step quickly; steps take a beat. */
      const beat = l.classList.contains('trace__line--sub') ? 90 : 220;
      const delay = lines.slice(0, i).reduce((acc, el) => acc + (el.classList.contains('trace__line--sub') ? 90 : 220), 0) + beat;
      timers.push(window.setTimeout(() => l.classList.add('is-in'), delay));
    });
  };

  /* Print once the terminal scrolls into view; replay on demand. */
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      play();
      io.disconnect();
    }
  }, { threshold: 0.3 });
  io.observe(term);
  replay?.addEventListener('click', play);
});
