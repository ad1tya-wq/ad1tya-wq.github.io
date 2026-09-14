import gsap from 'gsap';
import type { Field } from '../field';
import { computeAnchor } from '../field/layout';
import { massScale } from '../field/lifecycle';
import { sampleImage, sampleName } from '../field/namePoints';
import type { FieldState } from '../field/state';
import { eatenCount, orderBlocks, pointsFor, type BlockGeom, type Ordered } from './blocks';
import { RingPool } from './pool';

/**
 * Horizon "mass" slider: the heavier the hole, the farther it reaches. Text blocks nearer than its reach are eaten in
 * two acts: the block itself (real DOM, still readable) flies toward the hole, shrinking and thinning as it closes in;
 * where it ends, its glyphs become particles that spiral into the disk as dust (same sampler as the hero name). The
 * layout box stays, so nothing reflows. Eaten state persists while scrolling; lowering the slider runs both acts
 * backwards; at full mass everything is gone, the screen goes black and only "Reset the universe?" remains.
 */
const BODY = 1.8; // seconds the readable block takes to reach the hole
const SHRINK = 0.3; // its scale on arrival
const DUST = 1.2; // seconds of the particle spiral, same as the shader
const LAG = 0.3; // the last dust particle leaves this much later (shader: lag * 0.3)
const TEXT_SELECTOR =
  'main :is(h1, h2, h3, p, dt, dd, li.line, .btn, .link, .plate__issuer, .plate__title, .plate__verify, .row__link, .readout__fact)';

type Kind = 'text' | 'image' | 'fade';

interface Block {
  id: number;
  el: HTMLElement;
  kind: Kind;
  tier: 0 | 1 | 2;
  /** document-space glyph points, already moved to where the shrunken block ends, kept so the dust can fly back */
  pts: Float32Array | null;
  range: { from: number; to: number } | null;
  /** the body flight: forward = toward the hole; reversed on restore */
  body: gsap.core.Tween | null;
  /** shader-clock start of the current flight and its direction */
  startedAt: number;
  dir: 1 | -1;
  timer: number;
}

export function mountDevour({ state, field, reducedMotion }: { state: FieldState; field: Field | null; reducedMotion: boolean }): void {
  const root = document.querySelector<HTMLElement>('[data-devour]');
  const slider = root?.querySelector<HTMLInputElement>('[data-mass]');
  const out = root?.querySelector<HTMLElement>('[data-mass-out]');
  const status = root?.querySelector<HTMLElement>('[data-mass-status]');
  const reset = document.querySelector<HTMLButtonElement>('[data-mass-reset]'); // outside the control block: it floats over the void
  const horizon = document.getElementById('horizon');
  if (!root || !slider || !out || !status || !reset || !horizon) return;

  // ---- blocks: leaf text elements, the portrait, and the topbar last ----
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(TEXT_SELECTOR)).filter((el) => !el.closest('[data-devour]'));
  const leaves = candidates.filter((el) => !candidates.some((other) => other !== el && other.contains(el)));
  const blocks: Block[] = [];
  const add = (el: HTMLElement | null, kind: Kind, tier: 0 | 1 | 2 = 0) => {
    if (el) blocks.push({ id: blocks.length, el, kind, tier, pts: null, range: null, body: null, startedAt: 0, dir: 1, timer: 0 });
  };
  leaves.forEach((el) => add(el, 'text', el.closest('#contact') ? 1 : 0)); // contact details go after the rest of the page
  add(document.querySelector<HTMLElement>('.hero__portrait'), 'image');
  document.querySelectorAll<HTMLElement>('.seal').forEach((el) => add(el, 'fade')); // certificate seals go with their plates
  add(document.querySelector<HTMLElement>('.wordmark'), 'text', 2);
  add(document.querySelector<HTMLElement>('.topbar__contact'), 'text', 2);
  add(document.querySelector<HTMLElement>('[data-nav]'), 'fade', 2);
  const masthead = blocks.find((b) => b.el.matches('[data-name]'));
  const portrait = blocks.find((b) => b.kind === 'image');

  const pool = new RingPool(field?.eatSlots ?? 0);
  const usesParticles = !!field && !reducedMotion && pool.size > 0;

  // ---- geometry: measured once, on first use (a later resize would only reorder blocks that are already eaten) ----
  let ordered: Ordered[] | null = null;
  const measure = (): Ordered[] => {
    if (ordered) return ordered;
    const vh = window.innerHeight;
    const hole = { x: window.innerWidth / 2, y: horizon.getBoundingClientRect().top + window.scrollY + vh * 0.5 };
    const geoms: BlockGeom[] = [];
    for (const b of blocks) {
      const r = b.el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue; // hidden at this viewport (e.g. the desktop readout on a phone)
      geoms.push({ id: b.id, cx: r.left + r.width / 2, cy: r.top + window.scrollY + r.height / 2, area: r.width * r.height, tier: b.tier });
    }
    ordered = orderBlocks(geoms, hole);
    return ordered;
  };

  // ---- sampling: document-space glyph points for a block ----
  /** Where the hole is on screen right now (viewport css px): the object is centred once the hole has formed. */
  const holePx = () => {
    const a = computeAnchor(window.innerWidth, window.innerHeight);
    if (window.innerWidth >= 768) a.x = window.innerWidth * 0.5;
    return a;
  };

  const sample = (b: Block): { pts: Float32Array; centre: [number, number] } | null => {
    const count = pointsFor(b.el.offsetWidth * b.el.offsetHeight, pool.size);
    const res =
      b.kind === 'image'
        ? (() => {
            const img = b.el.querySelector<HTMLImageElement>('.dimg__dither');
            return img ? sampleImage(img, count) : null;
          })()
        : b.kind === 'text'
          ? sampleName(b.el, count)
          : null;
    if (!res) return null;
    const { points, box } = res;
    const doc = new Float32Array(points.length);
    const top = box.top + window.scrollY;
    for (let k = 0; k < points.length / 2; k++) {
      if (points[2 * k]! < 0) {
        doc[2 * k] = box.left;
        doc[2 * k + 1] = top;
        continue;
      }
      doc[2 * k] = box.left + points[2 * k]! * box.width;
      doc[2 * k + 1] = top + points[2 * k + 1]! * box.height;
    }
    return { pts: doc, centre: [box.left + box.width / 2, top + box.height / 2] };
  };

  /** Glyph points moved and shrunk to where the body flight ends (document css px). */
  const atArrival = (pts: Float32Array, centre: [number, number], end: [number, number]): Float32Array => {
    const out = new Float32Array(pts.length);
    for (let k = 0; k < pts.length / 2; k++) {
      out[2 * k] = end[0] + (pts[2 * k]! - centre[0]) * SHRINK;
      out[2 * k + 1] = end[1] + (pts[2 * k + 1]! - centre[1]) * SHRINK;
    }
    return out;
  };

  /** Starts the dust: particles take over at the arrival point and the DOM block goes invisible in place. */
  const startDust = (b: Block) => {
    if (!b.pts) return;
    const a = pool.alloc(b.id, b.pts.length / 2);
    for (const id of a.evicted) blocks[id]!.range = null; // those particles are in the disk now; the block stays eaten
    b.range = { from: a.from, to: a.to };
    b.startedAt = field!.now();
    b.dir = 1;
    field!.setEat(b.range.from, b.pts, b.startedAt, 1);
    b.el.classList.add('is-eaten');
  };

  /** Where the block's flight is right now, so a reversal starts from there instead of jumping. */
  const startFor = (b: Block, dir: 1 | -1): number => {
    const now = field!.now();
    if (!b.range || !b.pts) return now; // no flight in progress
    const elapsed = Math.min(DUST, now - b.startedAt);
    return b.dir === dir ? b.startedAt : now - (DUST - elapsed);
  };

  const eat = (b: Block) => {
    window.clearTimeout(b.timer);
    if (b === masthead) state.nameEaten = 1;
    if (b === portrait) state.faceEaten = 1;
    if (usesParticles && b.kind !== 'fade') {
      if (b.range && b.pts) {
        // dust is flying back out: send it in again from where it is
        const start = startFor(b, 1);
        b.startedAt = start;
        b.dir = 1;
        field!.setEat(b.range.from, b.pts, start, 1);
        return;
      }
      if (b.body && b.body.reversed()) {
        b.body.play(); // the body was flying home: turn it around
        return;
      }
      const sampled = sample(b);
      if (sampled) {
        // arrive just outside the shadow, on the side the block came from, so the dust spirals in view of the ring
        const hole = holePx();
        const cy = sampled.centre[1] - window.scrollY;
        const dx = sampled.centre[0] - hole.x;
        const dy = cy - hole.y;
        const len = Math.hypot(dx, dy) || 1;
        const edge = Math.min(len, hole.r * 0.16 * massScale(state.mass) * 5.5); // blocks already that close only shrink in place
        const end: [number, number] = [hole.x + (dx / len) * edge, hole.y + (dy / len) * edge + window.scrollY];
        b.pts = atArrival(sampled.pts, sampled.centre, end);
        b.el.classList.remove('is-fading');
        b.body?.kill();
        b.body = gsap.fromTo(
          b.el,
          { x: 0, y: 0, scale: 1, opacity: 1 },
          {
            x: end[0] - sampled.centre[0],
            y: end[1] - sampled.centre[1],
            scale: SHRINK,
            opacity: 0.55,
            duration: BODY,
            ease: 'power2.in',
            overwrite: true,
            onComplete: () => startDust(b),
            onReverseComplete: () => {
              gsap.set(b.el, { clearProps: 'transform,opacity' });
              b.body = null;
              b.pts = null;
            },
          },
        );
        return;
      }
    }
    // no particles (reduced motion, the nav pill, or nothing to sample): fade, then hide
    b.el.classList.add('is-fading');
    b.timer = window.setTimeout(() => b.el.classList.add('is-eaten'), 400);
  };

  const restore = (b: Block) => {
    window.clearTimeout(b.timer);
    if (b === masthead) state.nameEaten = 0;
    if (b === portrait) state.faceEaten = 0;
    if (usesParticles && b.range && b.pts) {
      // dust first: back to the arrival point, then the body flies home
      const start = startFor(b, -1);
      b.startedAt = start;
      b.dir = -1;
      field!.setEat(b.range.from, b.pts, start, -1);
      const remaining = DUST + LAG - Math.max(0, field!.now() - start); // wait for the most lagged particle
      b.timer = window.setTimeout(() => {
        b.el.classList.remove('is-eaten');
        if (b.range) field!.clearEat(b.range.from, b.range.to);
        pool.free(b.id);
        b.range = null;
        b.body?.reverse();
      }, remaining * 1000 + 50);
      return;
    }
    if (usesParticles && b.body) {
      // still on its way in, or its dust was recycled into the disk (pool eviction): the body flies home from where it is
      b.el.classList.remove('is-eaten');
      b.pts = null;
      b.body.reverse();
      return;
    }
    // fade back in: visible first (still transparent), then let the transition run
    b.el.classList.add('is-fading');
    b.el.classList.remove('is-eaten');
    requestAnimationFrame(() => requestAnimationFrame(() => b.el.classList.remove('is-fading')));
  };

  // ---- slider ----
  // a reload after Reset lands at the top; give scroll restoration back to the browser for ordinary navigation
  history.scrollRestoration = 'auto';
  slider.value = '0'; // some browsers restore form values across a reload; the field always starts at rest
  let eaten = 0;
  let voidTimer = 0;
  const say = (text: string) => {
    if (status.textContent !== text) status.textContent = text; // an unchanged live region should not re-announce
  };
  let voided = false;
  const enterVoid = () => {
    voided = true;
    slider.disabled = true; // nothing comes back from here except through Reset
    document.body.classList.add('is-void');
    reset.hidden = false;
    reset.focus({ preventScroll: true });
  };
  const apply = () => {
    if (voided) return;
    const m = Number(slider.value) / 100;
    state.mass = m;
    const solar = 1 + 9 * m;
    out.textContent = `${solar.toFixed(1)} M☉`;
    slider.setAttribute('aria-valuetext', `${solar.toFixed(1)} solar masses`);
    const list = measure();
    const n = eatenCount(list, m, eaten);
    if (n > eaten) for (let i = eaten; i < n; i++) eat(blocks[list[i]!.id]!);
    else if (n < eaten) for (let i = eaten - 1; i >= n; i--) restore(blocks[list[i]!.id]!);
    eaten = n;
    window.clearTimeout(voidTimer);
    const all = n === list.length && list.length > 0;
    reset.hidden = true;
    if (all) {
      say('Nothing escapes.');
      voidTimer = window.setTimeout(enterVoid, reducedMotion ? 450 : (BODY + DUST + LAG) * 1000 + 200);
    } else if (n === 0) say('More mass, more reach.');
    else say(`${n} of ${list.length} blocks taken. Lower the mass to let them out.`);
  };
  slider.addEventListener('input', apply);

  reset.addEventListener('click', () => {
    history.scrollRestoration = 'manual'; // come back at the top: the name re-assembles from the cloud
    location.reload();
  });
}
