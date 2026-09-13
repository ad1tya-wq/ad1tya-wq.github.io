import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Field } from './field';
import { sampleImage, sampleName } from './field/namePoints';
import type { FieldState } from './field/state';

gsap.registerPlugin(ScrollTrigger);

/**
 * Hero: the name and the portrait are made of particles.
 * - Name: assembles onto the h1 after fonts load, then streams into the star on scroll.
 * - Portrait, desktop (hover-capable): particles from the start; hover or focus morphs them into the real photo.
 * - Portrait, touch: the dithered image is visible at rest and dissolves on the first scroll.
 * Reduced motion: real text and image stay, no particles for either.
 */
export function mountHero({ state, field }: { state: FieldState; field: Field | null }): void {
  const h1 = document.querySelector<HTMLElement>('[data-name]');
  const wrapper = document.querySelector<HTMLElement>('.hero__portrait');
  const img = wrapper?.querySelector<HTMLImageElement>('.dimg__dither');
  const button = wrapper?.querySelector<HTMLElement>('[data-dimg]');
  if (!h1 || !field || state.reducedMotion) return;

  const hoverCapable = window.matchMedia('(hover: hover)').matches;
  let resizeTimer = 0;

  const uploadName = () => {
    const sampled = sampleName(h1, field.nameSlots);
    if (!sampled) return false;
    field.setNamePoints(sampled.points);
    field.setNameBox(sampled.box.left, sampled.box.top + window.scrollY, sampled.box.width, sampled.box.height);
    return true;
  };

  const uploadFace = () => {
    if (!img) return false;
    const sampled = sampleImage(img, field.faceSlots);
    if (!sampled) return false;
    field.setFacePoints(sampled.points);
    field.setFaceBox(sampled.box.left, sampled.box.top + window.scrollY, sampled.box.width, sampled.box.height);
    return true;
  };

  const imageReady = img ? (img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => undefined)) : Promise.resolve();

  Promise.all([document.fonts.ready, imageReady]).then(() => {
    if (uploadName()) {
      gsap.to(state, { nameMix: 1, duration: 0.9, ease: 'power2.out', onComplete: () => h1.classList.add('is-assembled') });
    }
    if (uploadFace() && wrapper) {
      state.faceMix = 1;
      if (hoverCapable) {
        // desktop: particles are the portrait; the photo appears on hover/focus and the particles dim
        wrapper.classList.add('is-particles');
        const show = () => {
          button?.classList.add('is-hot');
          gsap.to(state, { faceReveal: 0.12, duration: 0.22, ease: 'power2.out' });
        };
        const hide = () => {
          if (button?.getAttribute('aria-pressed') === 'true') return; // pinned by a click
          button?.classList.remove('is-hot');
          gsap.to(state, { faceReveal: 1, duration: 0.3, ease: 'power2.out' });
        };
        wrapper.addEventListener('pointerenter', show);
        wrapper.addEventListener('pointerleave', hide);
        wrapper.addEventListener('focusin', show);
        wrapper.addEventListener('focusout', hide);
        button?.addEventListener('click', () => {
          // a click pins the photo (aria-pressed toggled by DitheredImage); keep particles dim while pinned
          const pinned = button.getAttribute('aria-pressed') === 'true';
          button.classList.toggle('is-hot', pinned);
          gsap.to(state, { faceReveal: pinned ? 0.12 : 1, duration: 0.25 });
        });
      } else {
        // touch: the image dissolves into the particles beneath it on the first scroll notch
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => wrapper.classList.toggle('is-dissolved', self.scroll() > 12),
        });
      }
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      uploadName();
      uploadFace();
    }, 200);
  });
}
