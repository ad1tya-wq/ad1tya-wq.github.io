import gsap from 'gsap';
import type { Field } from './field';
import { sampleName } from './field/namePoints';
import type { FieldState } from './field/state';

export function mountHero({ state, field }: { state: FieldState; field: Field | null }): void {
  const h1 = document.querySelector<HTMLElement>('[data-name]');
  if (!h1 || !field || state.reducedMotion) return; // reduced motion: the real h1 stays, no particles for the name

  let resizeTimer = 0;

  const upload = () => {
    const sampled = sampleName(h1, field.nameSlots);
    if (!sampled) return false;
    field.setNamePoints(sampled.points);
    field.setNameBox(sampled.box.left, sampled.box.top + window.scrollY, sampled.box.width, sampled.box.height);
    return true;
  };

  document.fonts.ready.then(() => {
    if (!upload()) return;
    gsap.to(state, {
      nameMix: 1,
      duration: 0.9,
      ease: 'power2.out',
      onComplete: () => h1.classList.add('is-assembled'),
    });
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(upload, 200);
  });
}
