/** Pure rules for what the hole eats at a given mass. Everything in css px, document coordinates. */

export interface BlockGeom {
  id: number;
  /** centre of the block in document px */
  cx: number;
  cy: number;
  area: number;
  /** eating order tier: 0 by distance, 1 = the contact details (kept until nearly everything else is gone), 2 = the topbar (last) */
  tier?: 0 | 1 | 2;
}

export interface Ordered extends BlockGeom {
  distance: number;
}

/**
 * Blocks sorted by distance from the hole within their tier; higher tiers are placed past the farthest block of the
 * tiers below, so the contact details go after the rest of the page and the topbar after everything.
 */
export function orderBlocks(blocks: BlockGeom[], hole: { x: number; y: number }): Ordered[] {
  const out: Ordered[] = [];
  let offset = 0;
  for (const tier of [0, 1, 2] as const) {
    const group = blocks
      .filter((b) => (b.tier ?? 0) === tier)
      .map((b) => ({ ...b, distance: offset + Math.hypot(b.cx - hole.x, b.cy - hole.y) }))
      .sort((a, b) => a.distance - b.distance);
    out.push(...group);
    if (group.length) offset = group[group.length - 1]!.distance + 1;
  }
  return out;
}

/** Reach of the hole in document px for a slider value 0..1: nothing below 0.04, everything at 1. */
export function reach(mass: number, farthest: number): number {
  const m = Math.min(1, Math.max(0, mass));
  if (m < 0.04) return 0;
  return Math.pow((m - 0.04) / 0.96, 1.5) * (farthest + 1);
}

/**
 * How many of the ordered blocks are eaten at this mass, with hysteresis so a block does not flicker at its threshold:
 * a block is eaten once the reach passes its distance and restored only when the reach falls 24 px short of it.
 */
export function eatenCount(ordered: Ordered[], mass: number, previous: number, hysteresis = 24): number {
  const farthest = ordered.length ? ordered[ordered.length - 1]!.distance : 0;
  const r = reach(mass, farthest);
  let n = 0;
  for (const b of ordered) {
    const eaten = n < previous ? r > b.distance - hysteresis : r >= b.distance;
    if (!eaten) break;
    n++;
  }
  return n;
}

/** Particles a block gets from the pool: proportional to its area, bounded so a paragraph never starves the rest. */
export function pointsFor(area: number, poolSize: number): number {
  const cap = Math.max(60, Math.min(3000, Math.round(poolSize / 4)));
  return Math.max(60, Math.min(cap, Math.round(area / 8)));
}
