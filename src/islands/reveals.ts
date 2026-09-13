import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function mountReveals({ reducedMotion }: { reducedMotion: boolean }): void {
  const blocks = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  if (!reducedMotion) {
    blocks.forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 12,
        duration: 0.35,
        ease: 'power1.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
    });
  }

  // the experience hairline draws itself as the section scrolls by (accretion spiral)
  const path = document.querySelector<SVGPathElement>('[data-spiral] path');
  if (!path) return;
  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  if (reducedMotion) {
    path.style.strokeDashoffset = '0';
    return;
  }
  gsap.fromTo(
    path,
    { strokeDashoffset: length },
    {
      strokeDashoffset: 0,
      ease: 'none',
      scrollTrigger: { trigger: '#experience', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
    },
  );
}
