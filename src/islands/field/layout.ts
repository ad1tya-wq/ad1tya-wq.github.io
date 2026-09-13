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

/** clamp(area * 0.035, 15k, 60k), x0.4 on low-end devices (spec section 3). */
export function particleCount(vw: number, vh: number, lowEnd: boolean): number {
  const n = Math.min(80000, Math.max(20000, Math.round(vw * vh * 0.05)));
  return lowEnd ? Math.round(n * 0.4) : n;
}

export function textRectOf(el: Element | null): [number, number, number, number] {
  if (!el) return [0, 0, 0, 0];
  const r = el.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height];
}
