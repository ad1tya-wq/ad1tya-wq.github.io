import { describe, expect, it } from 'vitest';
import { eatenCount, orderBlocks, pointsFor, reach, type BlockGeom } from './blocks';

const hole = { x: 500, y: 5000 };
const blocks: BlockGeom[] = [
  { id: 0, cx: 500, cy: 4800, area: 5000 }, // 200 away
  { id: 1, cx: 500, cy: 1000, area: 5000 }, // 4000 away
  { id: 2, cx: 500, cy: 5600, area: 5000 }, // 600 away
  { id: 3, cx: 0, cy: 0, area: 1000, tier: 2 },
  { id: 4, cx: 500, cy: 5100, area: 1000, tier: 1 }, // 100 away but contact: after the free tier
];

describe('orderBlocks', () => {
  it('sorts by distance within tiers: page, then contact, then topbar', () => {
    const o = orderBlocks(blocks, hole);
    expect(o.map((b) => b.id)).toEqual([0, 2, 1, 4, 3]);
    for (let i = 1; i < o.length; i++) expect(o[i]!.distance).toBeGreaterThan(o[i - 1]!.distance);
  });
});

describe('reach', () => {
  it('is zero at rest, covers everything at full mass, and grows monotonically', () => {
    expect(reach(0, 4000)).toBe(0);
    expect(reach(0.03, 4000)).toBe(0);
    expect(reach(1, 4000)).toBeGreaterThan(4000);
    let last = 0;
    for (let m = 0; m <= 1; m += 0.05) {
      const r = reach(m, 4000);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
  });
});

describe('eatenCount', () => {
  const o = orderBlocks(blocks, hole);
  it('eats in order as the mass rises and everything at 1', () => {
    expect(eatenCount(o, 0, 0)).toBe(0);
    expect(eatenCount(o, 1, 0)).toBe(5);
    const counts = [0.2, 0.4, 0.6, 0.8, 1].map((m) => eatenCount(o, m, 0));
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]!);
  });
  it('applies hysteresis: a block just eaten is not restored by a tiny drop', () => {
    // find a mass where exactly the first block is eaten
    let m = 0;
    while (eatenCount(o, m, 0) < 1) m += 0.001;
    expect(eatenCount(o, m - 0.004, 1)).toBe(1); // previous = 1: stays eaten within the hysteresis band (~8 px short)
    expect(eatenCount(o, m - 0.004, 0)).toBe(0); // previous = 0: not eaten yet
  });
});

describe('pointsFor', () => {
  it('scales with area between bounds and respects the pool', () => {
    expect(pointsFor(100, 8000)).toBe(60);
    expect(pointsFor(6400, 8000)).toBe(800);
    expect(pointsFor(1e6, 8000)).toBe(2000);
    expect(pointsFor(1e6, 20000)).toBe(3000);
  });
});
