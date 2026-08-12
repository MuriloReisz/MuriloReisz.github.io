// ============================================================
//  Client interactions (framework-free). Bundled by Astro.
// ============================================================
import { $, $$, clamp01, debounce, prefersReduced } from './dom';

const root = document.documentElement;

/* ---------- Theme toggle ---------- */
function applyTheme(t: string) {
  if (t === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
  try { localStorage.setItem('theme', t); } catch {}
}
$('#themeToggle')?.addEventListener('click', () => {
  applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});

/* ---------- Scroll progress ---------- */
const progress = $('#scrollProgress');
if (progress) {
  /* scrollHeight/clientHeight are layout reads that only change on resize, so
     cache them; paint with scaleX (compositor) rather than width (layout), and
     coalesce to one write per frame. */
  let max = 0;
  let queued = false;
  const measure = () => {
    const h = document.documentElement;
    max = h.scrollHeight - h.clientHeight;
  };
  const paint = () => {
    queued = false;
    const p = max > 0 ? document.documentElement.scrollTop / max : 0;
    progress.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', debounce(() => { measure(); paint(); }, 140), { passive: true });
  measure();
  paint();
}

/* ---------- Nav: mega-menus (hover + focus, with intent delay) ---------- */
const navbarEl = $('.navbar');
const megaItems = $$('.navbar__item--mega');
const allMegas = $$('.navbar__mega');
let megaTimer = 0;
const closeAllMegas = () => {
  allMegas.forEach((m) => m.classList.remove('is-open'));
  megaItems.forEach((it) => $<HTMLAnchorElement>('a', it)?.setAttribute('aria-expanded', 'false'));
  navbarEl?.classList.remove('mega-open');
};
megaItems.forEach((item) => {
  const mega = document.getElementById(item.getAttribute('data-mega')!);
  const trigger = $<HTMLAnchorElement>('a', item);
  if (!mega || !trigger) return;
  const open = () => {
    clearTimeout(megaTimer);
    allMegas.forEach((m) => m !== mega && m.classList.remove('is-open'));
    mega.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    navbarEl?.classList.add('mega-open');
  };
  const scheduleClose = () => { megaTimer = window.setTimeout(closeAllMegas, 140); };
  item.addEventListener('mouseenter', open);
  item.addEventListener('mouseleave', scheduleClose);
  mega.addEventListener('mouseenter', () => clearTimeout(megaTimer));
  mega.addEventListener('mouseleave', scheduleClose);
  trigger.addEventListener('focus', open);
  // Let the trigger also work as a real link on click (don't hijack navigation).
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  /* The panel hides via visibility, so focus inside it would be orphaned —
     hand it back to the trigger before closing. */
  const openItem = megaItems.find((it) => $<HTMLAnchorElement>('a', it)?.getAttribute('aria-expanded') === 'true');
  const inside = allMegas.some((m) => m.contains(document.activeElement));
  closeAllMegas();
  if (inside) $<HTMLAnchorElement>('a', openItem ?? megaItems[0])?.focus();
});

/* ---------- Nav: burger (mobile) ---------- */
const burger = $('#navBurger');
const menu = $('#navMenu');
burger?.addEventListener('click', () => {
  const open = menu?.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(!!open));
});
$$('#navMenu a').forEach((a) => a.addEventListener('click', () => {
  menu?.classList.remove('is-open');
  burger?.setAttribute('aria-expanded', 'false');
}));

/* ---------- Nav: hide on scroll down ---------- */
const navbar = $('.navbar');
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  if (navbar) navbar.classList.toggle('navbar--hidden', y > 120 && y > lastY);
  navbar?.classList.toggle('navbar--solid', y > 12);
  lastY = y;
}, { passive: true });

/* ---------- Reveal on scroll + count-up ---------- */
/* Count-ups live in motion.ts under [data-counter-to] — one implementation, with
   decimals, locale grouping and a shared tween ticker. */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target as HTMLElement;
    // CSS uses .reveal/.sreveal/.fw__row -> .is-visible, and fw/exp micro-elements -> .is-in.
    // Adding both is harmless (each rule only reacts to the class defined for that element).
    el.classList.add('is-visible', 'is-in');
    io.unobserve(el);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
// Note: fw__line/msg/pipe/success are driven by the mock sequencer below, NOT this observer.
const REVEAL_SEL = '.reveal, .sreveal, [data-stagger] > *, .fw__row, .exp__more .exp__item';
$$(REVEAL_SEL).forEach((el) => io.observe(el));

/* ---------- "Learn more" accordions on the AI-services plan cards ---------- */
$$('.oa-learn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.getAttribute('aria-controls') || '');
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    target?.classList.toggle('is-open', !open);
  });
});

/* ---------- Framework mock players (voice / chat / flow) ---------- */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
$$('[data-mock]').forEach((mock) => {
  const kind = mock.classList.contains('fw__mock--voice') ? 'voice'
    : mock.classList.contains('fw__mock--chat') ? 'chat' : 'flow';
  const steps = $$<HTMLElement>('[data-step]', mock);
  const success = $<HTMLElement>('[data-success]', mock);
  const track = $<HTMLElement>('[data-track]', mock);
  const feed = $<HTMLElement>('[data-feed]', mock);
  if (!steps.length) return;

  if (prefersReduced()) {
    if (kind === 'voice') { steps[steps.length - 1].classList.add('is-in'); success?.classList.add('is-in'); }
    else { steps.forEach((s) => { s.classList.add('is-in'); if (kind === 'flow') s.classList.add('is-done'); }); }
    return;
  }

  let started = false;
  const scrollChat = (i: number) => {
    if (!track || !feed) return;
    const target = Math.max(0, steps[i].offsetTop + steps[i].offsetHeight - feed.clientHeight + 8);
    track.style.transform = `translateY(${-target}px)`;
  };
  const loop = async () => {
    while (true) {
      steps.forEach((s) => s.classList.remove('is-in', 'is-done'));
      success?.classList.remove('is-in');
      if (track) track.style.transform = 'translateY(0)';
      await wait(500);
      for (let i = 0; i < steps.length; i++) {
        steps[i].classList.add('is-in');
        if (kind === 'voice' && i > 0) steps[i - 1].classList.remove('is-in');
        if (kind === 'chat') scrollChat(i);
        if (kind === 'flow') { await wait(520); steps[i].classList.add('is-done'); }
        await wait(kind === 'voice' ? 1500 : kind === 'chat' ? 950 : 380);
      }
      if (success) { success.classList.add('is-in'); await wait(2400); success.classList.remove('is-in'); }
      await wait(700);
    }
  };
  const mockIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting && !started) { started = true; loop(); } });
  }, { threshold: 0.3 });
  mockIO.observe(mock);
});

/* ---------- Portfolio tool filter ---------- */
const filterBtns = $$<HTMLButtonElement>('.toolfilter [data-filter]');
// Any [data-tags] element, not just sections: the home page's featured
// cards are anchors (WorkCard.astro) while /work still uses sections.
const workCards = $$<HTMLElement>('[data-tags]');
filterBtns.forEach((btn) => btn.addEventListener('click', () => {
  const f = btn.getAttribute('data-filter')!;
  filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  workCards.forEach((card) => {
    const tags = (card.getAttribute('data-tags') || '').toLowerCase();
    const show = f === 'all' || tags.includes(f);
    card.classList.toggle('work--hidden', !show);
  });
}));

/* ---------- Read-more toggles ---------- */
$$('[aria-controls]').forEach((btn) => {
  if (!btn.matches('.exp__toggle, .exp__readmore')) return;
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.getAttribute('aria-controls')!);
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    target?.classList.toggle('is-open', !open);
    const label = $('.exp__toggle-label, .exp__readmore-label', btn);
    if (label && btn.classList.contains('exp__readmore')) label.textContent = open ? 'Read more' : 'Read less';
  });
});

/* ---------- FAQ accordions (.cs-qa__head toggles aria-expanded; CSS collapses the panel) ---------- */
$$('.cs-qa__head').forEach((head) => {
  head.addEventListener('click', () => {
    head.setAttribute('aria-expanded', String(head.getAttribute('aria-expanded') !== 'true'));
  });
});

/* ---------- Carousels ([data-carousel] with a scroll-snap .carousel__track) ---------- */
$$('[data-carousel]').forEach((carousel) => {
  const track = $<HTMLElement>('.carousel__track', carousel);
  if (!track) return;
  const items = $$<HTMLElement>(':scope > *', track);
  const step = () => (items[0]?.getBoundingClientRect().width ?? track.clientWidth * 0.8) + 18;
  $('.carousel__prev', carousel)?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('.carousel__next', carousel)?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

  // Optional dot rail ([data-carousel-dots] > [data-carousel-dot]): click to
  // jump, and reflect whichever item is nearest the scroll position.
  const dots = $$<HTMLButtonElement>('[data-carousel-dot]', carousel);
  if (dots.length) {
    dots.forEach((dot, i) => dot.addEventListener('click', () => {
      items[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }));
    const setActive = (i: number) => dots.forEach((d, di) => d.setAttribute('aria-selected', String(di === i)));
    const onScroll = debounce(() => {
      const trackLeft = track.getBoundingClientRect().left;
      let closest = 0;
      let closestDist = Infinity;
      items.forEach((item, i) => {
        const dist = Math.abs(item.getBoundingClientRect().left - trackLeft);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      setActive(closest);
    }, 80);
    track.addEventListener('scroll', onScroll, { passive: true });
  }
});

/* ---------- Compare table: select a plan column ---------- */
$$('.cmp, table').forEach((table) => {
  /* The control is a real <button> nested inside the <th>, so the header keeps
     its columnheader role and the data cells keep their association. */
  const btns = $$<HTMLButtonElement>('.cmp__plan-btn[data-col]', table);
  if (!btns.length) return;
  const select = (col: string) => {
    btns.forEach((b) => {
      const on = b.dataset.col === col;
      b.setAttribute('aria-pressed', String(on));
      b.closest('.cmp__plan')?.classList.toggle('is-sel', on);
    });
    $$<HTMLElement>('.cmp__cell[data-col]', table).forEach((c) => c.classList.toggle('cmp__col-sel', c.dataset.col === col));
  };
  /* A <button> handles Enter and Space natively — no key handler needed. */
  btns.forEach((b) => b.addEventListener('click', () => select(b.dataset.col!)));
});

/* ---------- Scroll-linked timeline fill (.tl__rail / .tl__fill) ---------- */
$$('.tl__rail').forEach((rail) => {
  const fill = $<HTMLElement>('.tl__fill', rail) || $<HTMLElement>('.tl__fill', rail.parentElement || document);
  if (!fill) return;
  let queued = false;
  const paint = () => {
    queued = false;
    const r = rail.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (innerHeight * 0.55 - r.top) / (r.height || 1)));
    /* scaleY, not height: the rule sets transform-origin/scaleY(0) and
       will-change: transform, so writing height left it scaled to nothing. */
    fill.style.transform = `scaleY(${p.toFixed(4)})`;
  };
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', debounce(paint, 140), { passive: true });
  paint();
});

/* ---------- "Into the machine" cold-open scroll portal ---------- */
const itmWrap = $('.itm-wrap');
if (itmWrap && !prefersReduced()) {
  const stage = $<HTMLElement>('.itm-stage', itmWrap);
  let raf = 0;
  const paint = () => {
    raf = 0;
    if (!stage) return;
    const total = itmWrap.getBoundingClientRect().height - innerHeight;
    const scrolled = -itmWrap.getBoundingClientRect().top;
    const p = total > 0 ? clamp01(scrolled / total) : 0;
    stage.style.setProperty('--itm-p', p.toFixed(4));
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  paint();
}

/* ---------- "Into the machine" HUD clock — ticks regardless of reduced
   motion; it's a once-a-second text update, not continuous animation. ---------- */
const itmClock = $('[data-itm-clock]');
if (itmClock) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tick = () => {
    const d = new Date();
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    itmClock.textContent = `SYSTEM_TIME ${date} ${time}`;
  };
  tick();
  setInterval(tick, 1000);
}

/* ---------- Contact form (client validation + status) ---------- */
$$<HTMLFormElement>('form.cta__form').forEach((form) => {
  form.addEventListener('submit', (e) => {
    let ok = true;
    const setErr = (name: string, msg: string) => {
      const err = form.querySelector(`#err-${name}, [data-err="${name}"]`);
      if (err) err.textContent = msg;
      if (msg) ok = false;
    };
    const name = form.querySelector<HTMLInputElement>('[name="name"]');
    const email = form.querySelector<HTMLInputElement>('[name="email"]');
    const message = form.querySelector<HTMLTextAreaElement>('[name="message"]');
    setErr('name', name && !name.value.trim() ? 'Please enter your name.' : '');
    setErr('email', email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value) ? 'Enter a valid email.' : '');
    setErr('message', message && !message.value.trim() ? 'Tell me a little about it.' : '');
    if (!ok) { e.preventDefault(); return; }
    // Placeholder: no backend wired. Prevent navigation and show a confirmation.
    if (form.getAttribute('action')?.includes('example.com') !== false) {
      e.preventDefault();
      const status = form.querySelector('.cta__status');
      if (status) status.textContent = 'Thanks! (Demo form — wire up a backend to receive messages.)';
      form.reset();
    }
  });
});

/* ---------- Cookie consent ---------- */
const consent = $('#consentBanner');
try {
  if (!localStorage.getItem('consent')) consent?.removeAttribute('hidden');
} catch {}
const setConsent = (v: string) => { try { localStorage.setItem('consent', v); } catch {}; consent?.setAttribute('hidden', ''); };
$('#consentAccept')?.addEventListener('click', () => setConsent('granted'));
$('#consentDecline')?.addEventListener('click', () => setConsent('denied'));
$('#cookieSettings')?.addEventListener('click', (e) => { e.preventDefault(); consent?.removeAttribute('hidden'); });

/* ---------- Modal focus management ----------
   Shared by the legal dialog and the ⌘K palette. Both are
   role="dialog" aria-modal="true", which makes everything outside them
   inert to assistive tech — so Tab must not be allowed to leave, Esc
   must close, and focus must return to whatever opened it. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement) {
  return $$<HTMLElement>(FOCUSABLE, root).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
  );
}

/** Keeps Tab inside `root` while it is open. */
function trapTab(root: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const f = focusablesIn(root);
  if (!f.length) {
    e.preventDefault();
    return;
  }
  const first = f[0];
  const last = f[f.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (e.shiftKey && (active === first || !root.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !root.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

/* ---------- Legal modal ---------- */
const legal = $('#legalScrim');
if (legal) {
  const box = $<HTMLElement>('#legalBox');
  let legalOpener: HTMLElement | null = null;

  const onLegalKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeLegal();
      return;
    }
    trapTab(legal, e);
  };
  const openLegal = (trigger: HTMLElement) => {
    legalOpener = trigger;
    legal.classList.add('is-open');
    document.addEventListener('keydown', onLegalKey);
    ($<HTMLElement>('#legalClose') ?? box)?.focus();
  };
  function closeLegal() {
    legal!.classList.remove('is-open');
    document.removeEventListener('keydown', onLegalKey);
    legalOpener?.focus();
    legalOpener = null;
  }

  $$('[data-legal-open]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openLegal(a as HTMLElement);
    })
  );
  $('#legalClose')?.addEventListener('click', closeLegal);
  legal.addEventListener('click', (e) => {
    if (e.target === legal) closeLegal();
  });
}

/* ---------- Command palette (⌘K) ---------- */
const cmdk = $('#cmdk');
const cmdkInput = $<HTMLInputElement>('#cmdkInput');
const cmdkList = $('#cmdkList');

/* Case-study entries are projected at build time into a JSON tag by
   Layout.astro. Importing src/data/projects.ts here instead would ship all
   nine full project objects — case-study prose, galleries, FAQs, ~46 KB — to
   every page, to build an index that needs five short fields. */
type CmdkEntry = { label: string; href: string; kw: string };
function projectEntries(): CmdkEntry[] {
  const tag = $('#cmdkProjects');
  if (!tag?.textContent) return [];
  try {
    return JSON.parse(tag.textContent) as CmdkEntry[];
  } catch {
    return [];
  }
}

const INDEX: CmdkEntry[] = [
  { label: 'Home', href: '/', kw: 'top hero start' },
  { label: 'About', href: '/#about', kw: 'bio who' },
  { label: 'Portfolio — all projects', href: '/work', kw: 'projects work case study grid' },
  { label: 'Playground — interactive demos', href: '/playground', kw: 'demo calculator sql forecast churn roi try' },
  { label: 'Experience', href: '/#experience', kw: 'jobs roles cv' },
  { label: 'Certifications & Achievements', href: '/#achievements', kw: 'certs awards education languages' },
  { label: 'Contact', href: '/#contact', kw: 'email get in touch enquiry' },
  { label: 'AI services', href: '/ai-services', kw: 'automation assessment' },
  { label: 'Analytics services', href: '/services', kw: 'dashboards forecasts' },
  { label: 'Meetup', href: '/meetup', kw: 'community event' },
  { label: 'Privacy & cookies', href: '/privacy', kw: 'gdpr data cookies storage analytics legal' },
  ...projectEntries(),
];
let cmdkActive = 0;
const cmdkEmpty = $('#cmdkEmpty');
let cmdkOpener: HTMLElement | null = null;

/** Mirrors the active option into aria-activedescendant, which is the only
    thing a screen reader listens to here — a CSS class alone is silent. */
function paintCmdkActive(items: HTMLElement[]) {
  items.forEach((it, i) => {
    const on = i === cmdkActive;
    it.classList.toggle('is-active', on);
    it.setAttribute('aria-selected', String(on));
  });
  const active = items[cmdkActive];
  if (active?.id) cmdkInput?.setAttribute('aria-activedescendant', active.id);
  else cmdkInput?.removeAttribute('aria-activedescendant');
  active?.scrollIntoView({ block: 'nearest' });
}

function renderCmdk(q: string) {
  if (!cmdkList) return;
  const ql = q.trim().toLowerCase();
  const items = INDEX.filter((i) => !ql || (i.label + ' ' + i.kw).toLowerCase().includes(ql));
  cmdkActive = 0;
  cmdkList.innerHTML = items
    .map(
      (i, idx) =>
        `<li class="cmdk-item" id="cmdk-opt-${idx}" role="option" aria-selected="false" data-href="${i.href}"><span>${i.label}</span></li>`
    )
    .join('');
  /* The empty state lives outside the listbox — a non-option child of
     role="listbox" is invalid, and it needs a live region to be announced. */
  cmdkEmpty?.toggleAttribute('hidden', items.length > 0);
  paintCmdkActive($$<HTMLElement>('.cmdk-item', cmdkList));
}

function openCmdk() {
  if (!cmdk) return;
  cmdkOpener = document.activeElement as HTMLElement | null;
  cmdk.classList.add('is-open');
  renderCmdk('');
  setTimeout(() => cmdkInput?.focus(), 20);
}
function closeCmdk() {
  if (!cmdk) return;
  cmdk.classList.remove('is-open');
  if (cmdkInput) {
    cmdkInput.value = '';
    cmdkInput.removeAttribute('aria-activedescendant');
  }
  /* Focus would otherwise be left on a display:none input and fall to <body>. */
  (cmdkOpener ?? $<HTMLElement>('#navSearch'))?.focus();
  cmdkOpener = null;
}
$('#navSearch')?.addEventListener('click', openCmdk);
cmdkInput?.addEventListener('input', () => renderCmdk(cmdkInput.value));
cmdk?.addEventListener('click', (e) => {
  if (e.target === cmdk) return closeCmdk();
  const li = (e.target as HTMLElement).closest<HTMLElement>('.cmdk-item');
  if (li?.dataset.href) location.href = li.dataset.href;
});
addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk?.classList.contains('is-open') ? closeCmdk() : openCmdk(); }
  if (!cmdk?.classList.contains('is-open')) return;
  const items = $$<HTMLElement>('.cmdk-item', cmdkList!);
  if (e.key === 'Escape') { e.preventDefault(); closeCmdk(); return; }
  if (e.key === 'Tab') { trapTab(cmdk, e); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); cmdkActive = Math.min(items.length - 1, cmdkActive + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkActive = Math.max(0, cmdkActive - 1); }
  else if (e.key === 'Home') { e.preventDefault(); cmdkActive = 0; }
  else if (e.key === 'End') { e.preventDefault(); cmdkActive = items.length - 1; }
  else if (e.key === 'Enter') { const h = items[cmdkActive]?.dataset.href; if (h) location.href = h; return; }
  else return;
  paintCmdkActive(items);
});

