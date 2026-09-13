import { describe, expect, it } from 'vitest';
import { accel, createProbe, escapeSpeed, predict, stepProbe } from './slingshot';

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

describe('escapeSpeed and predict', () => {
  it('escape speed falls with distance and diverges toward r_s', () => {
    expect(escapeSpeed(20, cfg)).toBeLessThan(escapeSpeed(5, cfg));
    expect(escapeSpeed(1.2, cfg)).toBeGreaterThan(escapeSpeed(1.5, cfg));
    expect(escapeSpeed(3, cfg)).toBeCloseTo(Math.sqrt(2 * cfg.gm / (3 - cfg.rs)));
  });
  it('predict returns the path a real probe would fly and stops at the outcome', () => {
    const path = predict(-14, 5, 3, 0, cfg, 400, 1 / 40);
    expect(path.length).toBeGreaterThan(20);
    expect(path.length % 2).toBe(0);
    const p = createProbe(-14, 5, 3, 0);
    for (let i = 0; i < 10; i++) stepProbe(p, cfg, 1 / 40);
    expect(path[2 * 9]).toBeCloseTo(p.x, 5); // the 10th predicted point is the 10th real step
    expect(path[2 * 9 + 1]).toBeCloseTo(p.y, 5);
  });
  it('predict of a probe at rest ends captured, shorter than the step budget', () => {
    const path = predict(8, 0, 0, 0, cfg, 5000, 1 / 40);
    expect(path.length / 2).toBeLessThan(5000);
  });
});
