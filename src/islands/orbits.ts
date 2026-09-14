import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Field } from './field';
import { computeAnchor } from './field/layout';
import { lerp, smoothstep } from './field/lifecycle';
import { beadAngle } from './field/particles';
import type { FieldState } from './field/state';

gsap.registerPlugin(ScrollTrigger);

const TETHER_STEP = 12; // css px between tether dots
const TETHER_MAX = 1200; // points the probe buffer holds

/**
 * Experience: each timeline entry owns an orbit ring around the object (older entries farther out). The first time an
 * entry reaches the viewport centre its ring is thrown into orbit from the entry's date tick (the shader animates the
 * launch from `orbitFrom`/`orbitBorn`); while an entry is the nearest to the centre, a dotted tether runs from its tick
 * to its bead so the row and the ring read as one thing.
 */
export function mountOrbits({ state, field }: { state: FieldState; field: Field | null }): void {
  const entries = Array.from(document.querySelectorAll<HTMLElement>('[data-orbit]'));
  if (entries.length === 0 || !field) return;
  const inBand: number[] = [];
  let pulse: gsap.core.Tween | null = null;
  const tether = new Float32Array(2 * TETHER_MAX);
  let tethered = false;

  /** The entry's date tick in document css px: the right end of the date line, where the launch starts. */
  const tickOf = (el: HTMLElement): [number, number] => {
    const dates = el.querySelector<HTMLElement>('.entry__dates') ?? el;
    const range = document.createRange();
    range.selectNodeContents(dates); // the text itself, not the block: the date line is as wide as the column
    const r = range.getBoundingClientRect();
    return [r.right + 12, r.top + r.height / 2 + window.scrollY];
  };

  /** Where the object is right now (viewport css px), including its drift to the centre as the hole forms. */
  const anchorNow = () => {
    const a = computeAnchor(window.innerWidth, window.innerHeight);
    if (window.innerWidth >= 768) a.x = lerp(a.x, window.innerWidth * 0.5, smoothstep(0.8, 0.86, state.progress));
    return a;
  };

  const birth = (ring: number, el: HTMLElement, delay = 0) => {
    if (state.orbitBorn[ring]! >= 0) return;
    const [x, y] = tickOf(el);
    state.orbitFrom[2 * ring] = x;
    state.orbitFrom[2 * ring + 1] = y;
    state.orbitBorn[ring] = state.reducedMotion ? field.now() - 10 : field.now() + delay; // reduced motion: already in place
  };
  /** Entries skipped by a jump still get their rings: everything more recent than the active entry launches, staggered. */
  const birthUpTo = (ring: number) => {
    let delay = 0;
    for (let r = ring - 1; r >= 0; r--) {
      const el = entries.find((e) => Number(e.dataset.orbit) === r);
      if (el && state.orbitBorn[r]! < 0) birth(r, el, (delay += 0.18));
    }
  };

  const apply = () => {
    const next = inBand.length ? inBand[inBand.length - 1]! : -1;
    if (next === state.orbitActive) return;
    state.orbitActive = next;
    if (next < 0) return;
    const el = entries.find((e) => Number(e.dataset.orbit) === next);
    if (el) birth(next, el);
    birthUpTo(next);
    if (state.reducedMotion) return;
    pulse?.kill();
    state.orbitGlow = 1;
    pulse = gsap.to(state, { orbitGlow: 0, duration: 0.9, ease: 'power2.out' });
  };

  // ---- tether: dots from the active entry's tick to its bead, recomputed each frame while the chapter is on screen ----
  const frame = () => {
    const ring = state.orbitActive;
    const inChapter = state.progress > 0.68 && state.progress < 0.815;
    const born = ring >= 0 && state.orbitBorn[ring]! >= 0 && field.now() - state.orbitBorn[ring]! > 1.1;
    if (!inChapter || !born) {
      if (tethered) {
        field.setProbe(null);
        tethered = false;
      }
      return;
    }
    const el = entries.find((e) => Number(e.dataset.orbit) === ring)!;
    const [tx, ty] = tickOf(el);
    const a = anchorNow();
    const ringR = 1.15 + 0.42 * ring;
    const ang = beadAngle(ring) + field.now() * 0.32 * Math.pow(ringR, -1.5);
    const bx = a.x + Math.cos(ang) * ringR * a.r;
    const by = a.y + Math.sin(ang) * 0.42 * ringR * a.r;
    const sx = tx;
    const sy = ty - window.scrollY;
    const len = Math.hypot(bx - sx, by - sy);
    const n = Math.min(TETHER_MAX, Math.max(2, Math.floor(len / TETHER_STEP)));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      tether[2 * i] = sx + (bx - sx) * t;
      tether[2 * i + 1] = sy + (by - sy) * t;
    }
    field.setProbe(tether.subarray(0, 2 * n));
    tethered = true;
  };
  gsap.ticker.add(frame);

  entries.forEach((el) => {
    const ring = Number(el.dataset.orbit);
    if (!Number.isFinite(ring)) return;
    ScrollTrigger.create({
      trigger: el,
      start: 'top 62%',
      end: 'bottom 38%',
      onToggle: (self) => {
        const at = inBand.indexOf(ring);
        if (self.isActive && at < 0) inBand.push(ring);
        if (!self.isActive && at >= 0) inBand.splice(at, 1);
        apply();
      },
    });
  });
}
