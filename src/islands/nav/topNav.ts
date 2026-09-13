import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollToPlugin);

export interface TopNav {
  setChapter(id: string): void;
  setScroll(direction: 1 | -1, y: number): void;
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function mountTopNav({ reducedMotion }: { reducedMotion: boolean }): TopNav | null {
  const topbar = document.querySelector<HTMLElement>('[data-topbar]');
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  const indicator = nav?.querySelector<HTMLElement>('[data-indicator]');
  const toggle = nav?.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const links = Array.from(nav?.querySelectorAll<HTMLAnchorElement>('[data-chapter-link]') ?? []);
  if (!topbar || !nav || !indicator || !toggle || links.length === 0) return null;

  let active: HTMLAnchorElement | null = null;
  let collapsed = false;
  let pinned = false; // hover or focus keeps the pill open
  let mobileOpen = false;
  let lastDirection: 1 | -1 = 1;
  let pastHero = false;
  let collapseTimer = 0;

  const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

  // ---- indicator: FLIP with a slight stretch at mid-slide ----
  // Layout metrics (offsetLeft/offsetWidth) are used instead of getBoundingClientRect so that
  // measurements stay correct while the pill itself is mid-animation (transforms do not affect them).
  let indX = 0;
  let indW = 0;
  function moveIndicator(to: HTMLAnchorElement, animate: boolean) {
    const fromX = indX;
    const fromW = indW;
    const finalX = to.offsetLeft;
    const finalW = to.offsetWidth;
    indX = finalX;
    indW = finalW;
    indicator!.style.width = `${finalW}px`;
    indicator!.style.transform = `translateX(${finalX}px)`;
    indicator!.classList.add('is-visible');
    if (!animate || fromW === 0 || reducedMotion) return;
    const sx = fromW / finalW;
    indicator!.animate(
      [
        { transform: `translateX(${fromX}px) scaleX(${sx})` },
        { transform: `translateX(${(fromX + finalX) / 2}px) scaleX(${Math.max(sx, 1) * 1.08})`, offset: 0.5 },
        { transform: `translateX(${finalX}px) scaleX(1)` },
      ],
      { duration: 250, easing: EASE },
    );
  }

  function setChapter(id: string) {
    const link = links.find((l) => l.dataset.chapterLink === id);
    if (!link) {
      if (id === 'top') {
        active?.classList.remove('is-active');
        active = null;
        indicator!.classList.remove('is-visible');
        indicator!.style.width = '0px';
        indW = 0;
      }
      return; // 'contact' keeps the last highlighted section
    }
    if (link === active) return;
    active?.classList.remove('is-active');
    link.classList.add('is-active');
    active = link;
    if (collapsed) links.forEach((l) => (l.parentElement!.hidden = l !== active)); // keep only the new active visible
    moveIndicator(link, !collapsed);
  }

  // ---- collapse / expand (desktop): fade labels, then FLIP the pill width with a counter-scaled active label ----
  function applyCollapsed(next: boolean) {
    if (collapsed === next || isMobile()) return;
    collapsed = next;
    topbar!.classList.toggle('is-collapsed', next);
    nav!.classList.toggle('is-collapsed', next);
    const before = nav!.offsetWidth;

    const relayout = () => {
      // decided at apply time: the active chapter may have changed during the label fade
      links.forEach((l) => (l.parentElement!.hidden = next && l !== active));
      const after = nav!.offsetWidth;
      if (active) moveIndicator(active, false);
      if (reducedMotion || after === 0) return;
      const s = before / after;
      const opts: KeyframeAnimationOptions = { duration: 300, easing: EASE };
      nav!.animate([{ transform: `scaleX(${s})` }, { transform: 'scaleX(1)' }], opts);
      active?.animate([{ transform: `scaleX(${1 / s})` }, { transform: 'scaleX(1)' }], opts);
    };
    if (next) window.setTimeout(relayout, reducedMotion ? 0 : 150); // let the labels fade first
    else relayout();
  }

  function scheduleCollapse(delay: number) {
    window.clearTimeout(collapseTimer);
    collapseTimer = window.setTimeout(() => {
      if (!pinned && pastHero && lastDirection === 1) applyCollapsed(true);
    }, delay);
  }

  function setScroll(direction: 1 | -1, y: number) {
    lastDirection = direction;
    const hero = document.querySelector<HTMLElement>('[data-chapter="top"]');
    pastHero = y > (hero?.offsetHeight ?? window.innerHeight) * 0.6;
    if (!pastHero || direction === -1) {
      window.clearTimeout(collapseTimer);
      applyCollapsed(false);
      return;
    }
    if (!pinned) scheduleCollapse(250);
  }

  // hover and focus keep it open; leaving schedules a collapse 1.2 s later
  nav.addEventListener('pointerenter', () => {
    pinned = true;
    window.clearTimeout(collapseTimer);
    applyCollapsed(false);
  });
  nav.addEventListener('pointerleave', () => {
    pinned = false;
    scheduleCollapse(1200);
  });
  nav.addEventListener('focusin', () => {
    pinned = true;
    applyCollapsed(false);
  });
  nav.addEventListener('focusout', (e) => {
    if (nav!.contains(e.relatedTarget as Node | null)) return;
    pinned = false;
    scheduleCollapse(1200);
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    active?.focus();
    pinned = false;
    if (isMobile()) setMobileOpen(false);
    else applyCollapsed(true);
  });

  // ---- mobile toggle ----
  function setMobileOpen(open: boolean) {
    mobileOpen = open;
    toggle!.setAttribute('aria-expanded', String(open));
    nav!.classList.toggle('is-open', open);
    topbar!.classList.toggle('is-open', open);
    if (active) moveIndicator(active, false);
  }
  toggle.addEventListener('click', () => setMobileOpen(!mobileOpen));

  // ---- smooth scroll for every header hash link ----
  topbar.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector<HTMLElement>(a.getAttribute('href')!);
      if (!target) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('chapter:navigate'));
      if (isMobile()) setMobileOpen(false);
      gsap.to(window, { scrollTo: { y: target, autoKill: true }, duration: reducedMotion ? 0 : 0.8, ease: 'power2.inOut' });
      history.pushState(null, '', a.getAttribute('href'));
    });
  });

  window.addEventListener('resize', () => {
    if (active) moveIndicator(active, false);
  });

  return { setChapter, setScroll };
}
