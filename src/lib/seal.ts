import { mulberry32 } from '../islands/field/particles';

export type RingKind = 'solid' | 'segments' | 'ticks';

export interface Ring {
  r: number;
  width: number;
  kind: RingKind;
  /** stroke-dasharray [on, off] in viewBox units, null for solid rings */
  dash: [number, number] | null;
  /** rotation in degrees so segment gaps do not align between rings */
  rotate: number;
  tone: 'fog' | 'silver';
}

/** FNV-1a over the id string: a stable 32-bit seed for the ring generator. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Concentric ring seal, seeded per certificate: a calibration-dial echo of the photon ring.
 * Rings sit between r = 14 and r = 46 (viewBox 100), never overlapping, alternating tones.
 */
export function sealRings(id: string): Ring[] {
  const rnd = mulberry32(hashString(id));
  const count = 5 + Math.floor(rnd() * 4); // 5..8
  const rings: Ring[] = [];
  const span = 46 - 14;
  const step = span / count;
  let hasTicks = false;
  let hasSolid = false;
  for (let i = 0; i < count; i++) {
    const r = 14 + step * (i + 0.5) + (rnd() - 0.5) * step * 0.3;
    const width = 0.75 + rnd() * (i === count - 1 ? 2.25 : 1.25);
    let kind: RingKind = rnd() < 0.35 ? 'ticks' : rnd() < 0.55 ? 'segments' : 'solid';
    if (i === count - 1 && !hasTicks) kind = 'ticks';
    if (i === count - 2 && !hasSolid) kind = 'solid';
    if (kind === 'ticks') hasTicks = true;
    if (kind === 'solid') hasSolid = true;
    const circumference = 2 * Math.PI * r;
    let dash: [number, number] | null = null;
    if (kind === 'ticks') {
      const n = 24 + Math.floor(rnd() * 48);
      const on = Math.max(0.6, circumference / n * (0.15 + rnd() * 0.15));
      dash = [Number(on.toFixed(2)), Number((circumference / n - on).toFixed(2))];
    } else if (kind === 'segments') {
      const n = 2 + Math.floor(rnd() * 4);
      const on = circumference / n * (0.55 + rnd() * 0.3);
      dash = [Number(on.toFixed(2)), Number((circumference / n - on).toFixed(2))];
    }
    rings.push({
      r: Number(Math.min(r, 48 - width / 2).toFixed(2)),
      width: Number(width.toFixed(2)),
      kind,
      dash,
      rotate: Math.round(rnd() * 360),
      tone: i % 2 === 0 ? 'silver' : 'fog',
    });
  }
  return rings;
}
