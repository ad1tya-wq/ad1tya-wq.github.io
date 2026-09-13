import { describe, expect, it } from 'vitest';
import { hashString, sealRings } from './seal';

describe('hashString', () => {
  it('is deterministic and differs between ids', () => {
    expect(hashString('4RLJKWNTI6K2')).toBe(hashString('4RLJKWNTI6K2'));
    expect(hashString('4RLJKWNTI6K2')).not.toBe(hashString('S7FDYQMMP07E'));
  });
});

describe('sealRings', () => {
  const rings = sealRings('4RLJKWNTI6K2');
  it('produces 5 to 8 rings sorted outward inside the 100-unit viewBox', () => {
    expect(rings.length).toBeGreaterThanOrEqual(5);
    expect(rings.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < rings.length; i++) expect(rings[i]!.r).toBeGreaterThan(rings[i - 1]!.r);
    for (const r of rings) {
      expect(r.r).toBeGreaterThanOrEqual(14);
      expect(r.r + r.width / 2).toBeLessThanOrEqual(48);
      expect(r.width).toBeGreaterThanOrEqual(0.75);
      expect(r.width).toBeLessThanOrEqual(3);
      if (r.dash) expect(r.dash[0]).toBeGreaterThan(0);
    }
  });
  it('is deterministic per id and different across ids', () => {
    expect(sealRings('4RLJKWNTI6K2')).toEqual(rings);
    expect(sealRings('UP86WQHVDTV8')).not.toEqual(rings);
  });
  it('always includes at least one tick ring and one solid ring', () => {
    for (const id of ['4RLJKWNTI6K2', 'S7FDYQMMP07E', 'UP86WQHVDTV8', '07e6d06c04394fd884ad2e2420b8235c']) {
      const rs = sealRings(id);
      expect(rs.some((r) => r.kind === 'ticks')).toBe(true);
      expect(rs.some((r) => r.kind === 'solid')).toBe(true);
    }
  });
});
