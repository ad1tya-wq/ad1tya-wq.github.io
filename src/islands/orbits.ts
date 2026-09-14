import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { FieldState } from './field/state';

gsap.registerPlugin(ScrollTrigger);

/**
 * Experience: each timeline entry owns an orbit ring around the object (older entries farther out). The entry nearest
 * the viewport centre lights its ring and bead; changing rings gives a short pulse. The rings themselves live in the
 * vertex shader (attribute aOrbit); this only decides which one is lit.
 */
export function mountOrbits({ state }: { state: FieldState }): void {
  const entries = Array.from(document.querySelectorAll<HTMLElement>('[data-orbit]'));
  if (entries.length === 0) return;
  const inBand: number[] = [];
  let pulse: gsap.core.Tween | null = null;

  const apply = () => {
    const next = inBand.length ? inBand[inBand.length - 1]! : -1;
    if (next === state.orbitActive) return;
    state.orbitActive = next;
    if (next < 0 || state.reducedMotion) return;
    pulse?.kill();
    state.orbitGlow = 1;
    pulse = gsap.to(state, { orbitGlow: 0, duration: 0.9, ease: 'power2.out' });
  };

  entries.forEach((el) => {
    const ring = Number(el.dataset.orbit);
    if (!Number.isFinite(ring)) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 62%',
      end: 'bottom 38%',
      onToggle: (self) => {
        const at = inBand.indexOf(ring);
        if (self.isActive && at < 0) inBand.push(ring);
        if (!self.isActive && at >= 0) inBand.splice(at, 1);
        apply();
      },
    });
  });
}
