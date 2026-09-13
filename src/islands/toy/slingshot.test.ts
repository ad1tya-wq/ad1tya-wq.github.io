import { describe, expect, it } from 'vitest';
import { accel, createProbe, stepProbe } from './slingshot';

const cfg = { gm: 1, rs: 1, captureRadius: 1.5, escapeRadius: 60, orbitAfter: 40 };

describe('accel', () => {
  it('points toward the hole and grows faster than Newtonian near r_s', () => {
    const [ax, ay] = accel(10, 0, 1, 1);
    expect(ax).toBeLessThan(0);
    expect(ay).toBeCloseTo(0);
    const far = Math.hypot(...accel(10, 0, 1, 1));
    const near = Math.hypot(...accel(2, 0, 1, 1));
    expect(near / far).toBeGreaterThan(25); // Newtonian ratio would be 25
  });
});

describe('stepProbe', () => {
  it('keeps a circular orbit at r = 6 bounded', () => {
    const r = 6;
    const v = Math.sqrt(cfg.gm * r) / (r - cfg.rs); // circular speed in the Paczyński-Wiita potential
    const p = createProbe(r, 0, 0, v);
    for (let i = 0; i < 3000; i++) stepProbe(p, cfg, 1 / 120);
    const rr = Math.hypot(p.x, p.y);
    expect(rr).toBeGreaterThan(5);
    expect(rr).toBeLessThan(7);
    expect(p.outcome === 'flying' || p.outcome === 'orbiting').toBe(true);
  });
  it('captures a probe dropped from rest', () => {
    const p = createProbe(8, 0, 0, 0);
    for (let i = 0; i < 5000 && p.outcome === 'flying'; i++) stepProbe(p, cfg, 1 / 120);
    expect(p.outcome).toBe('captured');
  });
  it('lets a fast probe escape', () => {
    const p = createProbe(10, 0, 0, 3);
    for (let i = 0; i < 5000 && p.outcome === 'flying'; i++) stepProbe(p, cfg, 1 / 120);
    expect(p.outcome).toBe('escaped');
  });
  it('records a trail of at most capacity points', () => {
    const p = createProbe(10, 0, 0, 0.6, 50);
    for (let i = 0; i < 200; i++) stepProbe(p, cfg, 1 / 120);
    expect(p.trailCount).toBe(50);
  });
});
