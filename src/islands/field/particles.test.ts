import { describe, expect, it } from 'vitest';
import { generateParticles, mulberry32, valueNoise3 } from './particles';

describe('mulberry32', () => {
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('valueNoise3', () => {
  it('stays in [0, 1] and is continuous-ish', () => {
    const v0 = valueNoise3(1.2, 3.4, 5.6);
    const v1 = valueNoise3(1.2001, 3.4, 5.6);
    expect(v0).toBeGreaterThanOrEqual(0);
    expect(v0).toBeLessThanOrEqual(1);
    expect(Math.abs(v0 - v1)).toBeLessThan(0.01);
  });
});

describe('generateParticles', () => {
  const n = 5000;
  const p = generateParticles(n, 7, 42);

  it('sizes the buffers', () => {
    expect(p.count).toBe(n);
    expect(p.seed.length).toBe(4 * n);
    expect(p.star.length).toBe(3 * n);
    expect(p.ejecta.length).toBe(4 * n);
    expect(p.disk.length).toBe(4 * n);
    expect(p.fragment.length).toBe(n);
    expect(p.nameSlots).toBe(Math.round(0.35 * n));
    expect(p.faceSlots).toBe(Math.round(0.32 * n));
    expect(p.nameSlots + p.faceSlots).toBeLessThan(n);
  });

  it('keeps star points inside the unit sphere, weighted to the surface', () => {
    let outer = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(p.star[3 * i]!, p.star[3 * i + 1]!, p.star[3 * i + 2]!);
      expect(r).toBeLessThanOrEqual(1.0001);
      if (r > 0.8) outer++;
    }
    expect(outer / n).toBeGreaterThan(0.6);
  });

  it('gives unit ejecta directions with speed factors in [0.6, 1.4]', () => {
    for (let i = 0; i < n; i++) {
      const len = Math.hypot(p.ejecta[4 * i]!, p.ejecta[4 * i + 1]!, p.ejecta[4 * i + 2]!);
      expect(len).toBeCloseTo(1, 4);
      expect(p.ejecta[4 * i + 3]).toBeGreaterThanOrEqual(0.6);
      expect(p.ejecta[4 * i + 3]).toBeLessThanOrEqual(1.4);
    }
  });

  it('places disk radii in [3, 12] with about 30 % falling back', () => {
    let falls = 0;
    for (let i = 0; i < n; i++) {
      expect(p.disk[4 * i]).toBeGreaterThanOrEqual(3);
      expect(p.disk[4 * i]).toBeLessThanOrEqual(12);
      expect(p.disk[4 * i + 1]).toBeGreaterThanOrEqual(0);
      expect(p.disk[4 * i + 1]).toBeLessThan(Math.PI * 2);
      falls += p.disk[4 * i + 3]!;
    }
    expect(falls / n).toBeGreaterThan(0.25);
    expect(falls / n).toBeLessThan(0.35);
  });

  it('assigns every particle to one of the project fragments', () => {
    const seen = new Set<number>();
    for (let i = 0; i < n; i++) {
      const f = p.fragment[i]!;
      expect(Number.isInteger(f)).toBe(true);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(7);
      seen.add(f);
    }
    expect(seen.size).toBe(7);
  });

  it('is deterministic for a seed', () => {
    const q = generateParticles(200, 3, 9);
    const r = generateParticles(200, 3, 9);
    expect(Array.from(q.star)).toEqual(Array.from(r.star));
  });
});

describe('spacecraft particles', () => {
  it('reserves the first SHIP_COUNT particles for the hull and exhaust, sentinel elsewhere', async () => {
    const { SHIP_COUNT, SHIP_HULL, inShip } = await import('./particles');
    const p = generateParticles(2000, 7, 42);
    expect(p.ship.length).toBe(3 * 2000);
    for (let i = 0; i < SHIP_HULL; i++) {
      expect(p.ship[3 * i + 2]).toBe(0);
      expect(inShip(p.ship[3 * i]!, p.ship[3 * i + 1]!)).toBe(true);
    }
    for (let i = SHIP_HULL; i < SHIP_COUNT; i++) {
      expect(p.ship[3 * i]).toBeLessThan(-0.5);
      expect(p.ship[3 * i + 2]).toBeGreaterThan(0);
      expect(p.ship[3 * i + 2]).toBeLessThanOrEqual(1);
    }
    for (let i = SHIP_COUNT; i < 2000; i++) expect(p.ship[3 * i + 2]).toBe(-1);
  });
  it('inShip describes a dart: nose at the front, wider fins at the back, a nozzle gap', async () => {
    const { inShip } = await import('./particles');
    expect(inShip(0.45, 0)).toBe(true);
    expect(inShip(0.45, 0.05)).toBe(false);
    expect(inShip(-0.4, 0.15)).toBe(true);
    expect(inShip(-0.48, 0.0)).toBe(false);
    expect(inShip(0.6, 0)).toBe(false);
  });
});
