import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS, chapterProgress, type ChapterId } from './lifecycle';
import type { FieldState } from './state';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollOptions {
  state: FieldState;
  onChapter?: (id: ChapterId, el: HTMLElement) => void;
  onScroll?: (direction: 1 | -1, y: number) => void;
}

export function mountScroll({ state, onChapter, onScroll }: ScrollOptions) {
  const triggers: ScrollTrigger[] = [];

  for (const chapter of CHAPTERS) {
    const el = document.querySelector<HTMLElement>(`[data-chapter="${chapter.id}"]`);
    if (!el) continue;
    triggers.push(
      ScrollTrigger.create({
        trigger: el,
        // the hero starts at rest while its top is on screen: 0 at scroll 0, not half-melted at the fold
        start: chapter.id === 'top' ? 'top top' : 'top center',
        end: 'bottom center',
        onUpdate(self) {
          state.target = state.reducedMotion ? chapter.poster : chapterProgress(chapter.id, self.progress);
        },
        onToggle(self) {
          if (self.isActive) onChapter?.(chapter.id, el);
        },
      }),
    );
  }

  // one document-level trigger for direction (used by the collapsing nav)
  triggers.push(
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate(self) {
        onScroll?.(self.direction === -1 ? -1 : 1, self.scroll());
      },
    }),
  );

  // initial target from wherever the page already is (a hash landing, a reload mid-page); at rest otherwise
  const active = triggers.find((t) => t.isActive && t.vars.trigger);
  const chapter = active ? CHAPTERS.find((c) => c.id === (active.vars.trigger as HTMLElement).dataset.chapter) : undefined;
  state.target = chapter ? (state.reducedMotion ? chapter.poster : chapterProgress(chapter.id, active!.progress)) : state.reducedMotion ? CHAPTERS[0]!.poster : 0;
  if (chapter) state.progress = state.target; // no damped flight from the hero on a deep link

  return {
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => triggers.forEach((t) => t.kill()),
  };
}
