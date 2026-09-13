import { createField } from './field';
import { createState } from './field/state';

// The field (no GSAP) starts at once so the star is on screen with the first frame; behaviours follow a frame later.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('field') as HTMLCanvasElement | null;
const projectCount = Math.max(1, document.querySelectorAll('[data-fragment]').length);

export const state = createState(reducedMotion);
export const field = canvas ? createField(canvas, { state, projectCount }) : null;

// after the first frame, or after 300 ms in a background tab where frames do not run
let mounted = false;
const mount = () => {
  if (mounted) return;
  mounted = true;
  import('./behaviours').then(({ mountBehaviours }) => mountBehaviours({ state, field, reducedMotion }));
};
requestAnimationFrame(mount);
window.setTimeout(mount, 300);

if (import.meta.env.DEV) {
  // dev-only handle for inspecting lifecycle states from the console
  (window as unknown as { __portfolio: unknown }).__portfolio = { state, field };
}
