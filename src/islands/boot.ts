import { createField } from './field';
import { createState } from './field/state';
import { mountScroll } from './field/scroll';
import { mountTopNav } from './nav/topNav';
import { mountProjectsHover } from './projectsHover';
import { mountReveals } from './reveals';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('field') as HTMLCanvasElement | null;
const projectCount = Math.max(1, document.querySelectorAll('[data-fragment]').length);

export const state = createState(reducedMotion);
export const field = canvas ? createField(canvas, { state, projectCount }) : null;
const nav = mountTopNav({ reducedMotion });

export const scroll = mountScroll({
  state,
  onChapter(id, el) {
    field?.setChapterColumn(el.querySelector('.col'));
    nav?.setChapter(id);
  },
  onScroll(direction, y) {
    nav?.setScroll(direction, y);
  },
});

mountProjectsHover({ state });
mountReveals({ reducedMotion });

// ScrollTrigger measures once fonts and images are in
document.fonts.ready.then(() => scroll.refresh());

if (import.meta.env.DEV) {
  // dev-only handle for inspecting lifecycle states from the console
  (window as unknown as { __portfolio: unknown }).__portfolio = { state, field };
}
