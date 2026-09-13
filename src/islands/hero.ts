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
      if (hoverCapable && button) {
        // desktop: particles are the portrait; the photo appears as a wave spreading from the pointer,
        // particles inside the wave dim, and the wave recedes to where the pointer left
        wrapper.classList.add('is-particles');
        let tween: gsap.core.Tween | null = null;
        const farthest = (x: number, y: number, r: DOMRect) =>
          Math.hypot(Math.max(x - r.left, r.right - x), Math.max(y - r.top, r.bottom - y));
        // origin in viewport px for the field, in element px for the CSS clip-path
        const origin = (x: number, y: number) => {
          const r = button.getBoundingClientRect();
          state.waveX = x;
          state.waveY = y + window.scrollY;
          button.style.setProperty('--wave-x', `${x - r.left}px`);
          button.style.setProperty('--wave-y', `${y - r.top}px`);
          return farthest(x, y, r);
        };
        const setR = (r: number) => button.style.setProperty('--wave-r', `${r}px`);
        const pointOf = (e: Event) => {
          const r = button.getBoundingClientRect();
          return e instanceof PointerEvent ? [e.clientX, e.clientY] : [r.left + r.width / 2, r.top + r.height / 2];
        };
        const SPEED = 640; // css px per second: a front you can watch cross the face, not a cut
        const show = (e: Event) => {
          const [x, y] = pointOf(e) as [number, number];
          const max = origin(x, y);
          button.classList.add('is-hot');
          tween?.kill();
          tween = gsap.to(state, { waveR: max, duration: (max - state.waveR) / SPEED, ease: 'sine.out', onUpdate: () => setR(state.waveR) });
        };
        const hide = (e: Event) => {
          if (button.getAttribute('aria-pressed') === 'true') return; // pinned by a click
          const [x, y] = pointOf(e) as [number, number];
          state.waveR = origin(x, y); // re-centre on the exit point while still covering the whole portrait
          tween?.kill();
          tween = gsap.to(state, {
            waveR: 0,
            duration: state.waveR / SPEED,
            ease: 'sine.in',
            onUpdate: () => setR(state.waveR),
            onComplete: () => button.classList.remove('is-hot'),
          });
        };
        wrapper.addEventListener('pointerenter', show);
        wrapper.addEventListener('pointerleave', hide);
        wrapper.addEventListener('focusin', show);
        wrapper.addEventListener('focusout', hide);
        button.addEventListener('click', (e) => {
          // a click pins the photo (aria-pressed toggled by DitheredImage); unpinning lets the wave recede
          if (button.getAttribute('aria-pressed') === 'true') show(e);
          else hide(e);
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
