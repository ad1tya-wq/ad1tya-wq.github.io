import { describe, expect, it } from 'vitest';
import { computeAnchor, particleCount } from './layout';

describe('computeAnchor', () => {
  it('sits right of centre on desktop and centred high on mobile', () => {
    const d = computeAnchor(1440, 900);
    expect(d.x).toBeCloseTo(892.8);
    expect(d.y).toBe(450);
    expect(d.r).toBeCloseTo(144);
    const m = computeAnchor(390, 844);
    expect(m.x).toBe(195);
    expect(m.y).toBeCloseTo(320.72);
    expect(m.r).toBe(78);
  });
});

describe('particleCount', () => {
  it('clamps to [15k, 60k] and scales down on low-end devices', () => {
    expect(particleCount(1440, 900, false)).toBe(45360);
    expect(particleCount(390, 844, false)).toBe(15000);
    expect(particleCount(3840, 2160, false)).toBe(60000);
    expect(particleCount(1440, 900, true)).toBe(18144);
  });
});
