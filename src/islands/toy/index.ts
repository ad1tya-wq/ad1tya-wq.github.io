import gsap from 'gsap';
import type { Field } from '../field';
import { computeAnchor } from '../field/layout';
import type { FieldState } from '../field/state';
import { createProbe, stepProbe, type Probe } from './slingshot';

interface ToyDeps {
  state: FieldState;
  field: Field | null;
  pointer: { setEnabled(on: boolean): void } | null;
  reducedMotion: boolean;
}

// gm sets the pace: orbital speed scales with sqrt(gm), so 120 gives a flyby of a few seconds on screen
const CFG = { gm: 120, rs: 1, captureRadius: 1.5, escapeRadius: 40, orbitAfter: 12 };
const V = Math.sqrt(CFG.gm);

export function mountToy({ state, field, pointer, reducedMotion }: ToyDeps): void {
  const root = document.querySelector<HTMLElement>('[data-toy]');
  const button = root?.querySelector<HTMLButtonElement>('[data-toy-launch]');
  const status = root?.querySelector<HTMLElement>('[data-toy-status]');
  const section = document.getElementById('horizon');
  if (!root || !button || !status || !section || !field) return;
  const statusEl: HTMLElement = status;

  let probe: Probe | null = null;
  let angle = 0; // radians, keyboard-adjustable aim
  let speed = 0.7; // in units of sqrt(gm) r_s per second, keyboard-adjustable; the default grazes at r = 3 and escapes
  const px = new Float32Array(2 * 601);

  const rsPx = () => computeAnchor(window.innerWidth, window.innerHeight).r * 0.16;
  const anchor = () => {
    const a = computeAnchor(window.innerWidth, window.innerHeight);
    if (window.innerWidth >= 768) a.x = window.innerWidth * 0.5; // the object is centred once the hole has formed
    return a;
  };

  function toPx(x: number, y: number, out: Float32Array, i: number) {
    const a = anchor();
    const s = rsPx();
    out[2 * i] = a.x + x * s;
    out[2 * i + 1] = a.y + y * s;
  }

  function finish(text: string) {
    statusEl.textContent = text;
    pointer?.setEnabled(true);
    gsap.ticker.remove(frame);
    window.setTimeout(() => {
      probe = null;
      field!.setProbe(null);
    }, 1200);
  }

  function frame(_time: number, deltaMs: number) {
    if (!probe) return;
    stepProbe(probe, CFG, Math.min(deltaMs, 50) / 1000);
    // trail then head, in css px
    const cap = probe.trail.length / 2;
    let n = 0;
    for (let k = 0; k < probe.trailCount; k++) {
      const idx = (probe.trailHead - 1 - k + cap * 2) % cap;
      toPx(probe.trail[2 * idx]!, probe.trail[2 * idx + 1]!, px, n++);
    }
    toPx(probe.x, probe.y, px, n++);
    field!.setProbe(px.subarray(0, 2 * n));
    if (probe.outcome === 'captured') finish('Captured. Nothing gets out past 1.5 r_s.');
    else if (probe.outcome === 'escaped') finish('Escaped. Too fast for the well.');
    else if (probe.outcome === 'orbiting') finish('In orbit. A rare balance.');
  }

  function launch(x: number, y: number, vx: number, vy: number) {
    if (probe && probe.outcome === 'flying') return;
    probe = createProbe(x, y, vx, vy);
    statusEl.textContent = 'Probe away.';
    pointer?.setEnabled(false);
    gsap.ticker.add(frame);
  }

  function launchDefault() {
    // from 14 r_s left of the hole and 5 r_s below its plane, aimed by the keyboard-adjustable angle/speed
    launch(-14, 5, Math.cos(angle) * speed * V, Math.sin(angle) * speed * V);
  }

  button.addEventListener('click', launchDefault);
  button.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: () => (angle -= 0.087), ArrowRight: () => (angle += 0.087), ArrowUp: () => (speed *= 1.1), ArrowDown: () => (speed /= 1.1) }[e.key];
    if (!step) return;
    e.preventDefault();
    step();
    statusEl.textContent = `Aim ${Math.round((angle * 180) / Math.PI)}°, speed ${speed.toFixed(2)}`;
  });

  // drag anywhere in the section (not on controls) to aim: start point → launch point, drag vector → velocity
  let dragStart: { x: number; y: number } | null = null;
  section.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a, button')) return;
    dragStart = { x: e.clientX, y: e.clientY };
  });
  section.addEventListener('pointerup', (e) => {
    if (!dragStart) return;
    const a = anchor();
    const s = rsPx();
    const x = (dragStart.x - a.x) / s;
    const y = (dragStart.y - a.y) / s;
    const vx = ((e.clientX - dragStart.x) / s) * 0.03 * V;
    const vy = ((e.clientY - dragStart.y) / s) * 0.03 * V;
    dragStart = null;
    if (Math.hypot(vx, vy) < 0.5) return; // a tap, not a throw
    launch(x, y, vx, vy);
  });

  if (reducedMotion) statusEl.textContent = 'Motion is reduced: the probe still flies, the field stays still.';
}
