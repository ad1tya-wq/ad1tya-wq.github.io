import { describe, expect, it } from 'vitest';
import { RingPool } from './pool';

describe('RingPool', () => {
  it('hands out contiguous ranges and evicts the oldest when it wraps', () => {
    const p = new RingPool(100);
    expect(p.alloc(1, 40)).toEqual({ from: 0, to: 40, evicted: [] });
    expect(p.alloc(2, 40)).toEqual({ from: 40, to: 80, evicted: [] });
    const third = p.alloc(3, 40); // does not fit in 80..100: wraps and evicts 1
    expect(third.from).toBe(0);
    expect(third.evicted).toEqual([1]);
    expect(p.get(1)).toBeUndefined();
    expect(p.get(2)).toBeDefined();
  });
  it('frees by id and caps a request at the pool size', () => {
    const p = new RingPool(50);
    p.alloc(7, 500);
    expect(p.get(7)!.to).toBe(50);
    expect(p.free(7)!.from).toBe(0);
    expect(p.get(7)).toBeUndefined();
  });
});
