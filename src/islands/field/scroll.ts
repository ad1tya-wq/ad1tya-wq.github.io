import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS, chapterProgress, type ChapterId } from './lifecycle';
import type { FieldState } from './state';

gsap.registerPlugin(ScrollTrigger);

/** 0 when the section's top crosses the viewport centre, 1 when its bottom does. */
export function sectionProgress(rectTop: number, rectHeight: number, viewportHeight: number): number {
  const centre = viewportHeight / 2;
  const t = (centre - rectTop) / rectHeight;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

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
        start: 'top center',
        end: 'bottom center',
        onUpdate(self) {
          if (state.detached) return;
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

  // before the hero centre the star is at rest
  if (!state.detached) state.target = state.reducedMotion ? CHAPTERS[0]!.poster : 0;

  return {
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => triggers.forEach((t) => t.kill()),
  };
}
