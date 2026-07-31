// ============================================================
//  home.ts — the two home-page behaviours that need their own
//  hooks rather than a generic one:
//    • [data-skill-filter]  the SkillsPanel group switcher
//    • .hm-heat__cell       the activity-heatmap tooltip
//  Both degrade to fully usable content with JS off: every skill
//  group is server-rendered, and every cell carries an aria-label.
// ============================================================

import { $, $$ } from './dom';

/* ---------- Skills group switcher ---------- */
const skillBtns = $$<HTMLButtonElement>('[data-skill-filter]');
const skillGroups = $$<HTMLElement>('[data-skill-group]');

if (skillBtns.length && skillGroups.length) {
  const select = (key: string) => {
    skillBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skillFilter === key)));
    skillGroups.forEach((g) => {
      const show = key === 'all' || g.dataset.skillGroup === key;
      // `hidden` rather than a class: it keeps the group out of the
      // a11y tree and out of the tab order, not just off-screen.
      g.hidden = !show;
    });
  };
  skillBtns.forEach((b) => b.addEventListener('click', () => select(b.dataset.skillFilter || 'all')));
}

/* ---------- Activity heatmap tooltip ----------
   One tooltip element is shared by all 364 cells — appending one per
   cell would be wasteful, and position:fixed means no ancestor of the
   scrolling rail can clip it. The accessible name already lives on
   each cell, so this is purely a sighted-pointer affordance. */
const heatRail = $<HTMLElement>('.hm-heat__rail');

if (heatRail) {
  let tip: HTMLElement | null = null;

  const ensureTip = () => {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'hm-heat__tip';
      tip.setAttribute('aria-hidden', 'true');
      document.body.appendChild(tip);
    }
    return tip;
  };

  const show = (cell: HTMLElement) => {
    const text = cell.dataset.tip;
    if (!text) return;
    const t = ensureTip();
    const r = cell.getBoundingClientRect();
    t.textContent = text;
    t.style.setProperty('--hm-tip-x', `${Math.round(r.left + r.width / 2)}px`);
    t.style.setProperty('--hm-tip-y', `${Math.round(r.top)}px`);
    t.classList.add('is-on');
  };

  const hide = () => tip?.classList.remove('is-on');

  // Delegated, so the 364 cells cost two listeners rather than 728.
  const cellFrom = (e: Event) => (e.target as HTMLElement | null)?.closest<HTMLElement>('.hm-heat__cell');
  heatRail.addEventListener('pointerover', (e) => {
    const cell = cellFrom(e);
    if (cell) show(cell);
  });
  heatRail.addEventListener('pointerout', hide);
  heatRail.addEventListener('focusin', (e) => {
    const cell = cellFrom(e);
    if (cell) show(cell);
  });
  heatRail.addEventListener('focusout', hide);
  // The tooltip is position:fixed, so it must follow or vanish on scroll.
  heatRail.addEventListener('scroll', hide, { passive: true });
  addEventListener('scroll', hide, { passive: true });
}
