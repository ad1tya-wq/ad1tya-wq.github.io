import { describe, expect, it } from 'vitest';
import { mulberry32 } from './particles';
import { maskFromRGBA, pickPoints } from './namePoints';

describe('pickPoints', () => {
  it('returns count points that all fall inside filled mask cells', () => {
    const w = 8, h = 4;
    const mask = new Uint8Array(w * h);
    for (let x = 2; x < 6; x++) mask[1 * w + x] = 1; // one filled row segment
    const pts = pickPoints(mask, w, h, 50, mulberry32(1));
    expect(pts.length).toBe(100);
    for (let i = 0; i < 50; i++) {
      const cx = Math.floor(pts[2 * i]! * w);
      const cy = Math.floor(pts[2 * i + 1]! * h);
      expect(mask[cy * w + cx]).toBe(1);
    }
  });
  it('returns -1 sentinels for an empty mask', () => {
    const pts = pickPoints(new Uint8Array(16), 4, 4, 3, mulberry32(1));
    expect(Array.from(pts)).toEqual([-1, -1, -1, -1, -1, -1]);
  });
});

describe('maskFromRGBA', () => {
  it('keeps only opaque, bright pixels (the lit half of a 1-bit dither)', () => {
    // 2x2: bright opaque, dark opaque, bright transparent, mid-gray opaque
    const data = new Uint8ClampedArray([
      243, 242, 237, 255,
      21, 22, 23, 255,
      243, 242, 237, 0,
      120, 120, 120, 255,
    ]);
    expect(Array.from(maskFromRGBA(data, 2, 2))).toEqual([1, 0, 0, 0]);
  });
});
