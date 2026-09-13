import { createField } from './field';
import { createState } from './field/state';
import { mountScroll } from './field/scroll';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('field') as HTMLCanvasElement | null;
const projectCount = Math.max(1, document.querySelectorAll('[data-fragment]').length);

export const state = createState(reducedMotion);
export const field = canvas ? createField(canvas, { state, projectCount }) : null;

export const scroll = mountScroll({
  state,
  onChapter(_id, el) {
    field?.setChapterColumn(el.querySelector('.col'));
  },
});

// ScrollTrigger measures once fonts and images are in
document.fonts.ready.then(() => scroll.refresh());
