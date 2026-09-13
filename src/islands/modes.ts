import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MODE_TARGETS, type ModeId } from './field/lifecycle';
import type { FieldState } from './field/state';

export function mountModes({ state, reducedMotion }: { state: FieldState; reducedMotion: boolean }) {
  const root = document.querySelector<HTMLElement>('[data-modes]');
  if (!root) return null;
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]'));
  let tween: gsap.core.Tween | null = null;

  function select(id: ModeId) {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === id)));
    tween?.kill();
    if (id === 'scroll') {
      state.detached = false;
      ScrollTrigger.update(); // re-derive the target from the current scroll position
      return;
    }
    state.detached = true;
    tween = gsap.to(state, { target: MODE_TARGETS[id], duration: reducedMotion ? 0 : 1.1, ease: 'power2.inOut' });
  }

  buttons.forEach((b) => b.addEventListener('click', () => select(b.dataset.mode as ModeId)));

  // any real scrolling intent hands control back to the page
  const reattach = () => {
    if (state.detached) select('scroll');
  };
  window.addEventListener('wheel', reattach, { passive: true });
  window.addEventListener('touchmove', reattach, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key)) reattach();
  });
  window.addEventListener('chapter:navigate', reattach);

  return { select };
}
