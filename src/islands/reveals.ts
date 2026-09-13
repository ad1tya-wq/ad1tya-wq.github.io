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

  // skills: each band's labels slide out of their ticks once, staggered, as the band enters
  document.querySelectorAll<HTMLElement>('[data-band]').forEach((band) => {
    const labels = Array.from(band.querySelectorAll<HTMLElement>('.line__label'));
    labels.forEach((l, i) => (l.style.transitionDelay = reducedMotion ? '0ms' : `${i * 45}ms`));
    if (reducedMotion) {
      band.classList.add('is-revealed');
      return;
    }
    ScrollTrigger.create({ trigger: band, start: 'top 82%', once: true, onEnter: () => band.classList.add('is-revealed') });
  });

  // each timeline hairline draws itself as its block scrolls by (accretion spiral)
  document.querySelectorAll<SVGPathElement>('[data-spiral] path').forEach((path) => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    if (reducedMotion) {
      path.style.strokeDashoffset = '0';
      return;
    }
    const block = path.closest('.col') ?? path.closest('[data-spiral]')!;
    gsap.fromTo(
      path,
      { strokeDashoffset: length },
      {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: { trigger: block, start: 'top 70%', end: 'bottom 60%', scrub: 0.5 },
      },
    );
  });
}
