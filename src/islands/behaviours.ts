import type { Field } from './field';
import { mountScroll } from './field/scroll';
import type { FieldState } from './field/state';
import { mountTopNav } from './nav/topNav';
import { mountProjectsActive } from './projectsActive';
import { mountReveals } from './reveals';
import { mountHero } from './hero';
import { mountPointer } from './pointer';
import { mountToy } from './toy';

/**
 * Everything that needs GSAP: scroll mapping, nav, hero assembly, pointer, toy, project pictograms, reveals.
 * Loaded after the first frame (see boot.ts) so the page paints before this chunk is evaluated.
 */
export function mountBehaviours({ state, field, reducedMotion }: { state: FieldState; field: Field | null; reducedMotion: boolean }) {
  const nav = mountTopNav({ reducedMotion });
  const scroll = mountScroll({
    state,
    onChapter(id, el) {
      field?.setChapterColumn(el.querySelector('.col'));
      nav?.setChapter(id);
    },
    onScroll(direction, y) {
      nav?.setScroll(direction, y);
    },
  });
  mountHero({ state, field });
  const pointer = mountPointer({ state });
  mountToy({ state, field, pointer, reducedMotion });
  mountProjectsActive({ state, field });
  mountReveals({ reducedMotion });

  // ScrollTrigger measures once fonts and images are in
  document.fonts.ready.then(() => scroll.refresh());
  return { scroll, pointer };
}
