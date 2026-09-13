import gsap from 'gsap';
import type { FieldState } from './field/state';

export function mountPointer({ state }: { state: FieldState }) {
  let enabled = !state.reducedMotion && !window.matchMedia('(hover: none)').matches;
  let down = false;
  let idleTimer = 0;
  let tween: gsap.core.Tween | null = null;

  const to = (force: number, duration: number) => {
    tween?.kill();
    tween = gsap.to(state, { force, duration, ease: 'power2.out' });
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (!enabled) return;
      state.pointerX = e.clientX;
      state.pointerY = e.clientY;
      if (!down && state.force <= 0) to(1, 0.2); // repel while the pointer moves
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => !down && to(0, 0.6), 1500); // let the frame loop idle when still
    },
    { passive: true },
  );
  window.addEventListener('pointerdown', (e) => {
    if (!enabled || (e.target as Element).closest('a, button, input, textarea, select')) return;
    down = true;
    to(-1, 0.4); // press and hold attracts
  });
  const release = () => {
    if (!down) return;
    down = false;
    to(1, 0.3);
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  document.addEventListener('pointerleave', () => to(0, 0.3));
  window.addEventListener('blur', () => to(0, 0.2));

  return {
    setEnabled(on: boolean) {
      enabled = on && !state.reducedMotion;
      if (!enabled) {
        down = false;
        to(0, 0.2);
      }
    },
  };
}
