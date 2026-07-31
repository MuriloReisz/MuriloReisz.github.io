// ============================================================
//  Client interactions (framework-free). Bundled by Astro.
// ============================================================
import { $, $$, debounce, prefersReduced } from './dom';

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
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMegas(); });

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
const workCards = $$<HTMLElement>('section[data-tags]');
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
  const step = () => (track.querySelector<HTMLElement>(':scope > *')?.getBoundingClientRect().width ?? track.clientWidth * 0.8) + 18;
  $('.carousel__prev', carousel)?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  $('.carousel__next', carousel)?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
});

/* ---------- Compare table: select a plan column ---------- */
$$('.cmp, table').forEach((table) => {
  const heads = $$<HTMLElement>('.cmp__plan[data-col]', table);
  if (!heads.length) return;
  const select = (col: string) => {
    heads.forEach((h) => { const on = h.dataset.col === col; h.classList.toggle('is-sel', on); h.setAttribute('aria-pressed', String(on)); });
    $$<HTMLElement>('.cmp__cell[data-col]', table).forEach((c) => c.classList.toggle('cmp__col-sel', c.dataset.col === col));
  };
  heads.forEach((h) => {
    h.addEventListener('click', () => select(h.dataset.col!));
    h.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(h.dataset.col!); } });
  });
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

/* ---------- Legal modal ---------- */
const legal = $('#legalScrim');
$$('[data-legal-open]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); legal?.classList.add('is-open'); ($('#legalBox') as HTMLElement)?.focus(); }));
$('#legalClose')?.addEventListener('click', () => legal?.classList.remove('is-open'));
legal?.addEventListener('click', (e) => { if (e.target === legal) legal.classList.remove('is-open'); });

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
  ...projectEntries(),
];
let cmdkActive = 0;
function renderCmdk(q: string) {
  if (!cmdkList) return;
  const ql = q.trim().toLowerCase();
  const items = INDEX.filter((i) => !ql || (i.label + ' ' + i.kw).toLowerCase().includes(ql));
  cmdkActive = 0;
  cmdkList.innerHTML = items.map((i, idx) =>
    `<li class="cmdk-item${idx === 0 ? ' is-active' : ''}" role="option" data-href="${i.href}"><span>${i.label}</span></li>`
  ).join('') || '<li class="cmdk-empty">No results</li>';
}
function openCmdk() { cmdk?.classList.add('is-open'); renderCmdk(''); setTimeout(() => cmdkInput?.focus(), 20); }
function closeCmdk() { cmdk?.classList.remove('is-open'); if (cmdkInput) cmdkInput.value = ''; }
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
  const items = $$('.cmdk-item', cmdkList!);
  if (e.key === 'Escape') closeCmdk();
  else if (e.key === 'ArrowDown') { e.preventDefault(); cmdkActive = Math.min(items.length - 1, cmdkActive + 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkActive = Math.max(0, cmdkActive - 1); }
  else if (e.key === 'Enter') { const h = items[cmdkActive]?.dataset.href; if (h) location.href = h; return; }
  items.forEach((it, i) => it.classList.toggle('is-active', i === cmdkActive));
});

/* ---------- Hero constellation (animated tech background) ---------- */
const heroNet = document.getElementById('heroNet') as HTMLCanvasElement | null;
if (heroNet && !prefersReduced() && heroNet.getContext) {
  const ctx = heroNet.getContext('2d')!;
  const host = (heroNet.closest('.hero-host') as HTMLElement) || (heroNet.parentElement as HTMLElement);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const LINK = 132;
  type P = { x: number; y: number; vx: number; vy: number };
  let pts: P[] = [];
  let W = 0, H = 0, raf = 0, running = false;
  const mouse = { x: -9999, y: -9999, on: false };

  const themeColor = () =>
    document.documentElement.getAttribute('data-theme') === 'dark'
      ? { r: 167, g: 139, b: 250 }   // violet (dark)
      : { r: 109, g: 94, b: 240 };   // indigo (light)

  function resize() {
    const r = (heroNet!.parentElement as HTMLElement).getBoundingClientRect();
    W = r.width; H = r.height;
    if (W < 2 || H < 2) return;
    heroNet!.width = Math.round(W * dpr);
    heroNet!.height = Math.round(H * dpr);
    heroNet!.style.width = W + 'px';
    heroNet!.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.max(24, Math.min(94, Math.round((W * H) / 15000)));
    pts = [];
    for (let i = 0; i < target; i++) {
      pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3 });
    }
  }

  function frame() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    const c = themeColor();
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x <= 0 || p.x >= W) p.vx *= -1;
      if (p.y <= 0 || p.y >= H) p.vy *= -1;
      if (mouse.on) {
        const dx = mouse.x - p.x, dy = mouse.y - p.y;
        if (dx * dx + dy * dy < 22500) { p.vx += dx * 0.00002; p.vy += dy * 0.00002; }
      }
      p.vx = Math.max(-0.6, Math.min(0.6, p.vx));
      p.vy = Math.max(-0.6, Math.min(0.6, p.vy));
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${(1 - d / LINK) * 0.16})`;
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
    }
    if (mouse.on) {
      for (const p of pts) {
        const d = Math.hypot(mouse.x - p.x, mouse.y - p.y);
        if (d < LINK * 1.5) {
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${(1 - d / (LINK * 1.5)) * 0.32})`;
          ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        }
      }
    }
    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.55)`;
    for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, Math.PI * 2); ctx.fill(); }
    raf = requestAnimationFrame(frame);
  }

  const start = () => { if (!running && W > 2) { running = true; raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  host.addEventListener('mousemove', (e) => {
    const r = heroNet.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
  });
  host.addEventListener('mouseleave', () => { mouse.on = false; mouse.x = mouse.y = -9999; });
  let rt: number; addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(resize, 150); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop())), { threshold: 0 }).observe(host);

  resize();
  start();
}

