import type { Field } from '../field';
import { sampleImage, sampleName } from '../field/namePoints';
import type { FieldState } from '../field/state';
import { eatenCount, orderBlocks, pointsFor, type BlockGeom, type Ordered } from './blocks';
import { RingPool } from './pool';

/**
 * Horizon "mass" slider: the heavier the hole, the farther it reaches. Text blocks nearer than its reach are eaten:
 * their glyphs become particles (same sampler as the hero name) that spiral into the disk, and the DOM copy goes
 * invisible in place so nothing reflows. Eaten state persists while scrolling; lowering the slider brings blocks
 * back in reverse; at full mass everything is gone and "Reset the universe?" reloads the page.
 */
const FLIGHT = 1.6; // seconds, same as the shader
const TEXT_SELECTOR =
  'main :is(h1, h2, h3, p, dt, dd, li.line, .btn, .link, .plate__issuer, .plate__title, .plate__verify, .row__link, .readout__fact)';

type Kind = 'text' | 'image' | 'fade';

interface Block {
  id: number;
  el: HTMLElement;
  kind: Kind;
  tier: 0 | 1 | 2;
  /** document-space glyph points from the last sampling, kept so the block can fly back the same way */
  pts: Float32Array | null;
  range: { from: number; to: number } | null;
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
  const reset = root?.querySelector<HTMLButtonElement>('[data-mass-reset]');
  const horizon = document.getElementById('horizon');
  if (!root || !slider || !out || !status || !reset || !horizon) return;

  // ---- blocks: leaf text elements, the portrait, and the topbar last ----
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(TEXT_SELECTOR)).filter((el) => !el.closest('[data-devour]'));
  const leaves = candidates.filter((el) => !candidates.some((other) => other !== el && other.contains(el)));
  const blocks: Block[] = [];
  const add = (el: HTMLElement | null, kind: Kind, tier: 0 | 1 | 2 = 0) => {
    if (el) blocks.push({ id: blocks.length, el, kind, tier, pts: null, range: null, startedAt: 0, dir: 1, timer: 0 });
  };
  leaves.forEach((el) => add(el, 'text', el.closest('#contact') ? 1 : 0)); // contact details go after the rest of the page
  add(document.querySelector<HTMLElement>('.hero__portrait'), 'image');
  add(document.querySelector<HTMLElement>('.wordmark'), 'text', 2);
  add(document.querySelector<HTMLElement>('.topbar__contact'), 'text', 2);
  add(document.querySelector<HTMLElement>('[data-nav]'), 'fade', 2);
  const masthead = blocks.find((b) => b.el.matches('[data-name]'));
  const portrait = blocks.find((b) => b.kind === 'image');

  const pool = new RingPool(field?.eatSlots ?? 0);
  const usesParticles = !!field && !reducedMotion && pool.size > 0;

  // ---- geometry: measured lazily, invalidated on resize ----
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
  window.addEventListener('resize', () => (ordered = null));

  // ---- sampling: document-space glyph points for a block ----
  const sample = (b: Block): Float32Array | null => {
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
    return doc;
  };

  /** Where the block's flight is right now, so a reversal starts from there instead of jumping. */
  const startFor = (b: Block, dir: 1 | -1): number => {
    const now = field!.now();
    if (!b.range || !b.pts) return now; // no flight in progress
    const elapsed = Math.min(FLIGHT, now - b.startedAt);
    return b.dir === dir ? b.startedAt : now - (FLIGHT - elapsed);
  };

  const eat = (b: Block) => {
    window.clearTimeout(b.timer);
    if (b === masthead) state.nameEaten = 1;
    if (b === portrait) state.faceEaten = 1;
    if (usesParticles && b.kind !== 'fade') {
      const reversing = b.range && b.dir === -1;
      const pts = reversing ? b.pts : sample(b);
      if (pts) {
        const start = startFor(b, 1); // measured before a fresh allocation, which would otherwise look like an old flight
        if (!reversing) {
          const a = pool.alloc(b.id, pts.length / 2);
          for (const id of a.evicted) blocks[id]!.range = null; // those particles are in the disk now; the block stays eaten
          b.range = { from: a.from, to: a.to };
        }
        b.pts = pts;
        b.startedAt = start;
        b.dir = 1;
        field!.setEat(b.range!.from, pts, start, 1);
        b.el.classList.remove('is-fading');
        b.el.classList.add('is-eaten'); // particles already sit on the glyphs
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
      const start = startFor(b, -1);
      b.startedAt = start;
      b.dir = -1;
      field!.setEat(b.range.from, b.pts, start, -1);
      const remaining = FLIGHT - Math.max(0, field!.now() - start);
      b.timer = window.setTimeout(() => {
        b.el.classList.remove('is-eaten');
        if (b.range) field!.clearEat(b.range.from, b.range.to);
        pool.free(b.id);
        b.range = null;
        b.pts = null;
      }, remaining * 1000 + 50);
      return;
    }
    // fade back in: visible first (still transparent), then let the transition run
    b.el.classList.add('is-fading');
    b.el.classList.remove('is-eaten');
    requestAnimationFrame(() => requestAnimationFrame(() => b.el.classList.remove('is-fading')));
  };

  // ---- slider ----
  let eaten = 0;
  let voidTimer = 0;
  const apply = () => {
    const m = Number(slider.value) / 1000;
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
      status.textContent = 'Nothing escapes.';
      voidTimer = window.setTimeout(() => (reset.hidden = false), reducedMotion ? 450 : FLIGHT * 1000 + 200);
    } else if (n === 0) status.textContent = 'More mass, more reach.';
    else status.textContent = `${n} of ${list.length} blocks taken. Lower the mass to let them out.`;
  };
  slider.addEventListener('input', apply);

  reset.addEventListener('click', () => {
    history.scrollRestoration = 'manual'; // come back at the top: the name re-assembles from the cloud
    location.reload();
  });
}
