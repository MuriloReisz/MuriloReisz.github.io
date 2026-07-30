// ============================================================
//  Motion 2 — pointer, loop and navigation effects.
//  Side-effect module: no exports. Every hook is presence-checked
//  so this file is inert on pages that do not use it.
//
//  Hooks:  [data-tilt] [data-magnetic] [data-spotlight] [data-typing]
//          [data-marquee] .mo-hscroll [data-toc] [data-back-to-top]
//          [data-reader-progress]
//  Never touches #scrollProgress — site.ts owns that.
// ============================================================

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const prefersReduced = () => reduceMQ.matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

const clamp = (n: number, min: number, max: number) => (n < min ? min : n > max ? max : n);
const attrNum = (el: Element, name: string, fallback: number) => {
  const raw = el.getAttribute(name);
  const n = raw === null ? NaN : parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
};
const debounce = (fn: () => void, wait = 160) => {
  let t = 0;
  return () => {
    clearTimeout(t);
    t = window.setTimeout(fn, wait);
  };
};

/* ---------- Pointer tilt ---------- */
const tiltEls = $$('[data-tilt]');
if (tiltEls.length && finePointer.matches && !prefersReduced()) {
  tiltEls.forEach((el) => {
    el.classList.add('mo-tilt');
    const max = clamp(attrNum(el, 'data-tilt-max', 6), 0, 14);
    let raf = 0;
    let rx = 0;
    let ry = 0;

    const paint = () => {
      raf = 0;
      el.style.setProperty('--mo-tilt-x', ry.toFixed(2) + 'deg');
      el.style.setProperty('--mo-tilt-y', rx.toFixed(2) + 'deg');
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    el.addEventListener('pointermove', (ev) => {
      const e = ev as PointerEvent;
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      ry = px * max * 2;
      rx = -py * max * 2;
      schedule();
    }, { passive: true });

    el.addEventListener('pointerenter', (ev) => {
      if ((ev as PointerEvent).pointerType !== 'mouse') return;
      el.classList.add('is-tilting');
    });

    const reset = () => {
      rx = 0;
      ry = 0;
      el.classList.remove('is-tilting');
      schedule();
    };
    el.addEventListener('pointerleave', reset);
    el.addEventListener('pointercancel', reset);
    el.addEventListener('blur', reset, true);
  });
}

/* ---------- Magnetic nudge ---------- */
const magneticEls = $$('[data-magnetic]');
if (magneticEls.length && finePointer.matches && !prefersReduced()) {
  magneticEls.forEach((el) => {
    el.classList.add('mo-magnetic');
    const pull = clamp(attrNum(el, 'data-magnetic-strength', 6), 0, 18);
    let raf = 0;
    let mx = 0;
    let my = 0;

    const paint = () => {
      raf = 0;
      el.style.setProperty('--mo-magnet-x', mx.toFixed(2) + 'px');
      el.style.setProperty('--mo-magnet-y', my.toFixed(2) + 'px');
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    el.addEventListener('pointermove', (ev) => {
      const e = ev as PointerEvent;
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      mx = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1) * pull;
      my = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1) * pull;
      schedule();
    }, { passive: true });

    el.addEventListener('pointerenter', (ev) => {
      if ((ev as PointerEvent).pointerType !== 'mouse') return;
      el.classList.add('is-magnetised');
    });

    const release = () => {
      mx = 0;
      my = 0;
      el.classList.remove('is-magnetised');
      schedule();
    };
    el.addEventListener('pointerleave', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('blur', release, true);
  });
}

/* ---------- Cursor spotlight ---------- */
const spotlightEls = $$('[data-spotlight]');
if (spotlightEls.length && finePointer.matches) {
  spotlightEls.forEach((el) => {
    el.classList.add('mo-spotlight');
    let raf = 0;
    let x = 50;
    let y = 50;

    const paint = () => {
      raf = 0;
      el.style.setProperty('--mx', x.toFixed(2) + '%');
      el.style.setProperty('--my', y.toFixed(2) + '%');
    };

    el.addEventListener('pointermove', (ev) => {
      const e = ev as PointerEvent;
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });

    el.addEventListener('pointerenter', (ev) => {
      if ((ev as PointerEvent).pointerType !== 'mouse') return;
      el.classList.add('is-lit');
    });
    el.addEventListener('pointerleave', () => el.classList.remove('is-lit'));
  });
}

/* ---------- Typing loop ---------- */
const typingEls = $$('[data-typing]');
typingEls.forEach((host) => {
  const source = host.getAttribute('data-typing-words') || host.textContent || '';
  const words = source.split('|').map((w) => w.trim()).filter(Boolean);
  const first = words[0];
  if (!first) return;

  host.classList.add('mo-typing');
  host.textContent = '';

  const out = document.createElement('span');
  out.className = 'mo-typing__text';
  out.setAttribute('aria-hidden', 'true');
  const caret = document.createElement('span');
  caret.className = 'mo-typing__caret';
  caret.setAttribute('aria-hidden', 'true');
  const sr = document.createElement('span');
  sr.className = 'mo-sr';
  sr.textContent = first;
  host.append(out, caret, sr);

  // Reduced motion (or nothing to cycle): leave the first word in place.
  if (prefersReduced() || words.length < 2) {
    out.textContent = first;
    host.classList.add('is-static');
    return;
  }

  const typeMs = clamp(attrNum(host, 'data-typing-speed', 68), 16, 400);
  const holdMs = clamp(attrNum(host, 'data-typing-hold', 1500), 200, 8000);
  const delMs = Math.max(16, Math.round(typeMs * 0.5));

  let index = 0;
  let chars = 0;
  let deleting = false;
  let onScreen = true;
  let timer = 0;

  const step = () => {
    timer = 0;
    if (!onScreen || document.hidden) return;
    const word = words[index % words.length] as string;
    if (!deleting) {
      chars = Math.min(word.length, chars + 1);
      out.textContent = word.slice(0, chars);
      sr.textContent = word;
      if (chars >= word.length) {
        deleting = true;
        timer = window.setTimeout(step, holdMs);
        return;
      }
      timer = window.setTimeout(step, typeMs);
    } else {
      chars = Math.max(0, chars - 1);
      out.textContent = word.slice(0, chars);
      if (chars === 0) {
        deleting = false;
        index += 1;
        timer = window.setTimeout(step, typeMs * 3);
        return;
      }
      timer = window.setTimeout(step, delMs);
    }
  };

  const resume = () => {
    if (!timer && onScreen && !document.hidden) timer = window.setTimeout(step, typeMs);
  };
  const halt = () => {
    if (timer) clearTimeout(timer);
    timer = 0;
  };

  document.addEventListener('visibilitychange', () => (document.hidden ? halt() : resume()));

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        onScreen = entry.isIntersecting;
        if (onScreen) resume();
        else halt();
      });
    }, { rootMargin: '0px 0px -5% 0px' }).observe(host);
  } else {
    resume();
  }
  resume();
});

/* ---------- Seamless marquee ---------- */
const marqueeEls = $$('[data-marquee]');
if (marqueeEls.length && !prefersReduced()) {
  marqueeEls.forEach((host) => {
    host.classList.add('mo-marquee');
    const reverse = host.hasAttribute('data-marquee-reverse');
    const speed = clamp(attrNum(host, 'data-marquee-speed', 44), 4, 400); // px per second
    if (reverse) host.classList.add('mo-marquee--reverse');

    const track = document.createElement('div');
    track.className = 'mo-marquee__track';
    const group = document.createElement('div');
    group.className = 'mo-marquee__group';
    while (host.firstChild) group.appendChild(host.firstChild);
    track.appendChild(group);
    host.appendChild(track);

    let groupWidth = 0;
    let offset = 0;
    let raf = 0;
    let last = 0;
    let hovered = false;
    let focused = false;
    let onScreen = true;

    const measure = () => {
      // Trim back to the source group, then clone until the track is >= 2x the host.
      while (track.children.length > 1) track.removeChild(track.lastChild as ChildNode);
      groupWidth = group.getBoundingClientRect().width;
      const hostWidth = host.getBoundingClientRect().width;
      if (groupWidth < 1) return;
      const copies = Math.max(2, Math.ceil((hostWidth * 2) / groupWidth) + 1);
      for (let i = 1; i < copies; i += 1) {
        const clone = group.cloneNode(true) as HTMLElement;
        clone.setAttribute('aria-hidden', 'true');
        clone.classList.add('mo-marquee__group--clone');
        $$('a, button, input, select, textarea, [tabindex]', clone).forEach((n) => n.setAttribute('tabindex', '-1'));
        track.appendChild(clone);
      }
      offset = reverse ? -groupWidth : 0;
      track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px,0,0)';
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (groupWidth > 0) {
        offset += (reverse ? 1 : -1) * speed * (dt / 1000);
        if (offset <= -groupWidth) offset += groupWidth;
        if (offset >= 0) offset -= groupWidth;
        track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px,0,0)';
      }
      play();
    };

    const running = () => onScreen && !hovered && !focused && !document.hidden;
    let paused = false;
    function play() {
      const go = running();
      if (go !== !paused) {
        paused = !go;
        host.classList.toggle('is-paused', paused);
      }
      if (!go) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
        return;
      }
      if (!raf) raf = requestAnimationFrame(frame);
    }

    host.addEventListener('pointerenter', () => { hovered = true; play(); });
    host.addEventListener('pointerleave', () => { hovered = false; play(); });
    host.addEventListener('focusin', () => { focused = true; play(); });
    host.addEventListener('focusout', () => { focused = false; play(); });
    document.addEventListener('visibilitychange', play);
    addEventListener('resize', debounce(() => { measure(); play(); }, 180));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => { onScreen = entry.isIntersecting; });
        play();
      }, { rootMargin: '120px 0px' }).observe(host);
    }

    measure();
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      document.fonts.ready.then(() => { measure(); play(); }).catch(() => {});
    }
    play();
  });
}

/* ---------- Wheel-to-horizontal rails ---------- */
$$('.mo-hscroll').forEach((rail) => {
  const sync = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    rail.classList.toggle('is-scrollable', max > 1);
    rail.classList.toggle('is-start', rail.scrollLeft <= 1);
    rail.classList.toggle('is-end', max <= 1 || rail.scrollLeft >= max - 1);
  };
  rail.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', debounce(sync, 140));
  sync();

  rail.addEventListener('wheel', (ev) => {
    const e = ev as WheelEvent;
    if (e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return;
    // Trackpad already scrolling sideways — let the browser handle it.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const max = rail.scrollWidth - rail.clientWidth;
    if (max <= 1 || e.deltaY === 0) return;
    // Release the wheel at either end so the page keeps scrolling.
    if (e.deltaY < 0 && rail.scrollLeft <= 0) return;
    if (e.deltaY > 0 && rail.scrollLeft >= max) return;
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 16;
    else if (e.deltaMode === 2) delta *= rail.clientWidth;
    e.preventDefault();
    rail.scrollLeft = clamp(rail.scrollLeft + delta, 0, max);
    sync();
  }, { passive: false });
});

/* ---------- Table-of-contents scroll-spy ---------- */
$$('[data-toc]').forEach((toc) => {
  const links = $$<HTMLAnchorElement>('a[href^="#"]', toc);
  const targets = $$('[data-toc-target]');
  if (!links.length || !targets.length) return;

  const pairs = links
    .map((link) => {
      const id = decodeURIComponent(link.hash.slice(1));
      const target = id ? targets.find((t) => t.id === id) ?? null : null;
      return { link, target };
    })
    .filter((p): p is { link: HTMLAnchorElement; target: HTMLElement } => p.target !== null);
  if (!pairs.length) return;

  let current: HTMLAnchorElement | null = null;
  let raf = 0;

  const measure = () => {
    raf = 0;
    const line = innerHeight * 0.4;
    let active = pairs[0] as { link: HTMLAnchorElement; target: HTMLElement };
    pairs.forEach((pair) => {
      if (pair.target.getBoundingClientRect().top <= line) active = pair;
    });
    if (active.link === current) return;
    if (current) {
      current.classList.remove('is-active');
      current.removeAttribute('aria-current');
    }
    current = active.link;
    current.classList.add('is-active');
    current.setAttribute('aria-current', 'true');
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(measure);
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', debounce(measure, 140));
  measure();
});

/* ---------- Back to top ---------- */
const toTop = $<HTMLButtonElement>('[data-back-to-top]');
if (toTop) {
  const threshold = clamp(attrNum(toTop, 'data-back-to-top-at', 600), 0, 5000);
  let shown = false;
  let raf = 0;

  const measure = () => {
    raf = 0;
    const next = scrollY > threshold;
    if (next === shown) return;
    shown = next;
    toTop.classList.toggle('is-shown', shown);
  };
  addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(measure);
  }, { passive: true });
  measure();

  toTop.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: prefersReduced() ? 'auto' : 'smooth' });
    const skip = $<HTMLElement>('.skip-link') || $<HTMLElement>('main');
    if (skip) {
      skip.setAttribute('tabindex', '-1');
      skip.focus({ preventScroll: true });
    }
  });
}

/* ---------- Case-study read progress ---------- */
$$('[data-reader-progress]').forEach((bar) => {
  const sel = bar.getAttribute('data-reader-progress');
  const article =
    (sel ? $<HTMLElement>(sel) : null) ||
    bar.closest('article') ||
    $<HTMLElement>('.reader__case') ||
    $<HTMLElement>('.reader__content') ||
    $<HTMLElement>('article');
  if (!article) return;

  bar.classList.add('mo-readbar');
  const fill = $<HTMLElement>('.mo-readbar__fill', bar);
  const live = bar.getAttribute('role') === 'progressbar' ? bar : $<HTMLElement>('[role="progressbar"]', bar);
  let raf = 0;
  let last = -1;

  const measure = () => {
    raf = 0;
    const rect = article.getBoundingClientRect();
    // Progress across the article's own bounds, not the document's.
    const span = rect.height - innerHeight;
    const ratio = span > 0 ? clamp(-rect.top / span, 0, 1) : rect.bottom <= innerHeight ? 1 : 0;
    const pct = Math.round(ratio * 1000) / 10;
    if (pct === last) return;
    last = pct;
    bar.style.setProperty('--mo-read', String(ratio.toFixed(4)));
    if (fill) fill.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    bar.classList.toggle('is-shown', rect.top < innerHeight * 0.5 && rect.bottom > 0);
    if (live) live.setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  addEventListener('scroll', () => {
    if (!raf) raf = requestAnimationFrame(measure);
  }, { passive: true });
  addEventListener('resize', debounce(measure, 140));
  measure();
});
