export interface Anchor {
  x: number;
  y: number;
  /** star radius R in css px */
  r: number;
}

/** Object sits right of centre on desktop, behind the content on mobile (spec section 2). */
export function computeAnchor(vw: number, vh: number): Anchor {
  const m = Math.min(vw, vh);
  if (vw < 768) return { x: vw * 0.5, y: vh * 0.38, r: m * 0.2 };
  return { x: vw * 0.62, y: vh * 0.5, r: m * 0.16 };
}

/**
 * clamp(area * 0.06, 24k, 96k), x0.4 on low-end devices. Split (see SLOTS): 35 % name, 32 % portrait, 15 % reserved for
 * text the hole eats, the remaining 18 % is the resting star at all times.
 */
export function particleCount(vw: number, vh: number, lowEnd: boolean): number {
  const n = Math.min(96000, Math.max(24000, Math.round(vw * vh * 0.06)));
  return lowEnd ? Math.round(n * 0.4) : n;
}

/** Fractions of the particle budget reserved for the name, the portrait and eaten text (the rest is the star). */
export const SLOTS = { name: 0.35, face: 0.32, eat: 0.15 } as const;

export function textRectOf(el: Element | null): [number, number, number, number] {
  if (!el) return [0, 0, 0, 0];
  const r = el.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height];
}
