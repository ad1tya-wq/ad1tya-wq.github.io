export type Outcome = 'flying' | 'captured' | 'escaped' | 'orbiting';

export interface Probe {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  outcome: Outcome;
  /** ring buffer of past positions (x, y pairs) */
  trail: Float32Array;
  trailCount: number;
  trailHead: number;
}

export interface ProbeConfig {
  gm: number;
  rs: number;
  captureRadius: number;
  escapeRadius: number;
  /** seconds of flight after which a still-bound probe counts as orbiting */
  orbitAfter: number;
}

export function createProbe(x: number, y: number, vx: number, vy: number, capacity = 600): Probe {
  return { x, y, vx, vy, t: 0, outcome: 'flying', trail: new Float32Array(2 * capacity), trailCount: 0, trailHead: 0 };
}

/** Paczyński-Wiita pseudo-Newtonian gravity: Φ = -GM / (r - r_s), so a = -GM / (r - r_s)² r̂. Reproduces an ISCO and capture. */
export function accel(x: number, y: number, gm: number, rs: number): [number, number] {
  const r = Math.hypot(x, y);
  const d = Math.max(r - rs, 0.05);
  const a = -gm / (d * d);
  return [(a * x) / r, (a * y) / r];
}

export function stepProbe(p: Probe, cfg: ProbeConfig, dt: number, substeps = 8): Probe {
  if (p.outcome !== 'flying') return p;
  const h = dt / substeps;
  for (let i = 0; i < substeps; i++) {
    const [ax, ay] = accel(p.x, p.y, cfg.gm, cfg.rs);
    p.vx += ax * h; // semi-implicit Euler: velocity first, then position
    p.vy += ay * h;
    p.x += p.vx * h;
    p.y += p.vy * h;
  }
  p.t += dt;
  const capacity = p.trail.length / 2;
  p.trail[2 * p.trailHead] = p.x;
  p.trail[2 * p.trailHead + 1] = p.y;
  p.trailHead = (p.trailHead + 1) % capacity;
  p.trailCount = Math.min(capacity, p.trailCount + 1);

  const r = Math.hypot(p.x, p.y);
  if (r < cfg.captureRadius) p.outcome = 'captured';
  else if (r > cfg.escapeRadius) p.outcome = 'escaped';
  else if (p.t > cfg.orbitAfter) p.outcome = 'orbiting';
  return p;
}
