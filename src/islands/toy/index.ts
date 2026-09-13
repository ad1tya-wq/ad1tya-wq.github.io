import gsap from 'gsap';
import type { Field } from '../field';
import { computeAnchor } from '../field/layout';
import type { FieldState } from '../field/state';
import { createProbe, escapeSpeed, predict, stepProbe, type Probe } from './slingshot';

interface ToyDeps {
  state: FieldState;
  field: Field | null;
  pointer: { setEnabled(on: boolean): void } | null;
  reducedMotion: boolean;
}

// gm sets the pace: orbital speed scales with sqrt(gm), so 120 gives a flyby of a few seconds on screen
const CFG = { gm: 120, rs: 1, captureRadius: 1.5, escapeRadius: 40, orbitAfter: 12 };
const V = Math.sqrt(CFG.gm);

export function mountToy({ field, pointer, reducedMotion }: ToyDeps): void {
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

  // ---- aiming: a launch state (position, velocity in sim units) with a live predicted path ----
  const DEFAULT_AIM = { x: -14, y: 5 };
  const preview = new Float32Array(2 * 400);
  let previewTimer = 0;

  function currentAim() {
    return { x: DEFAULT_AIM.x, y: DEFAULT_AIM.y, vx: Math.cos(angle) * speed * V, vy: Math.sin(angle) * speed * V };
  }

  /** Shows the path this launch would take as a dotted line (every other predicted step), for `holdMs` if given. */
  function showPreview(x: number, y: number, vx: number, vy: number, holdMs = 0) {
    if (probe && probe.outcome === 'flying') return;
    const path = predict(x, y, vx, vy, CFG, 480, 1 / 40);
    let n = 0;
    for (let k = 0; k < path.length / 2 && n < 400; k += 2) toPx(path[2 * k]!, path[2 * k + 1]!, preview, n++);
    field!.setProbe(preview.subarray(0, 2 * n));
    window.clearTimeout(previewTimer);
    if (holdMs) previewTimer = window.setTimeout(clearPreview, holdMs);
  }
  function clearPreview() {
    if (probe) return; // a flight owns the probe buffer
    field!.setProbe(null);
  }
  function describe(x: number, y: number, vx: number, vy: number) {
    const v = Math.hypot(vx, vy);
    const ratio = v / escapeSpeed(Math.hypot(x, y), CFG);
    const deg = Math.round((Math.atan2(-vy, vx) * 180) / Math.PI);
    statusEl.textContent = `Aim ${deg}°, ${ratio.toFixed(2)} × escape speed`;
  }

  function launchDefault() {
    const a = currentAim();
    launch(a.x, a.y, a.vx, a.vy);
  }

  button.addEventListener('click', launchDefault);
  // hovering or focusing the button previews the default shot; arrow keys retune it (left/right aim, up/down speed)
  const previewDefault = () => {
    const a = currentAim();
    showPreview(a.x, a.y, a.vx, a.vy);
  };
  button.addEventListener('pointerenter', previewDefault);
  button.addEventListener('focus', previewDefault);
  button.addEventListener('pointerleave', clearPreview);
  button.addEventListener('blur', clearPreview);
  button.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: () => (angle -= 0.087), ArrowRight: () => (angle += 0.087), ArrowUp: () => (speed *= 1.1), ArrowDown: () => (speed /= 1.1) }[e.key];
    if (!step) return;
    e.preventDefault();
    step();
    const a = currentAim();
    showPreview(a.x, a.y, a.vx, a.vy);
    describe(a.x, a.y, a.vx, a.vy);
  });

  // drag anywhere in the section (not on controls): the press point is the launch point, the drag vector the
  // velocity (100 css px ≈ 0.55 √gm), with the predicted path drawn while dragging
  const DRAG_TO_SPEED = (0.55 * V) / 100;
  let dragStart: { x: number; y: number } | null = null;
  const dragToState = (e: PointerEvent) => {
    const a = anchor();
    const sPx = rsPx();
    return {
      x: (dragStart!.x - a.x) / sPx,
      y: (dragStart!.y - a.y) / sPx,
      vx: (e.clientX - dragStart!.x) * DRAG_TO_SPEED,
      vy: (e.clientY - dragStart!.y) * DRAG_TO_SPEED,
      px: Math.hypot(e.clientX - dragStart!.x, e.clientY - dragStart!.y),
    };
  };
  section.addEventListener('pointerdown', (e) => {
    if ((e.target as Element).closest('a, button, input')) return;
    if (probe && probe.outcome === 'flying') return;
    e.preventDefault(); // no text selection while aiming
    dragStart = { x: e.clientX, y: e.clientY };
    section.setPointerCapture(e.pointerId);
    statusEl.textContent = 'Drag to aim, release to launch.';
  });
  section.addEventListener('pointermove', (e) => {
    if (!dragStart) return;
    const d = dragToState(e);
    if (d.px < 12) return;
    showPreview(d.x, d.y, d.vx, d.vy);
    describe(d.x, d.y, d.vx, d.vy);
  });
  const endDrag = (e: PointerEvent, fire: boolean) => {
    if (!dragStart) return;
    const d = dragToState(e);
    dragStart = null;
    if (!fire || d.px < 12) {
      clearPreview();
      statusEl.textContent = '';
      return; // a tap, not a throw
    }
    launch(d.x, d.y, d.vx, d.vy);
  };
  section.addEventListener('pointerup', (e) => endDrag(e, true));
  section.addEventListener('pointercancel', (e) => endDrag(e, false));

  if (reducedMotion) statusEl.textContent = 'Motion is reduced: the probe still flies, the field stays still.';
}
