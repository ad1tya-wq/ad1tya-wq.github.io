import { SLOTS } from './layout';

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const fade = (t: number) => t * t * (3 - 2 * t);

/** Trilinear value noise in [0, 1]. Nearby inputs give nearby outputs; that continuity is what forms filaments. */
export function valueNoise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = l(c(0, 0, 0), c(1, 0, 0), xf);
  const x10 = l(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = l(c(0, 0, 1), c(1, 0, 1), xf);
  const x11 = l(c(0, 1, 1), c(1, 1, 1), xf);
  return l(l(x00, x10, yf), l(x01, x11, yf), zf);
}

export interface ParticleBuffers {
  count: number;
  seed: Float32Array;
  star: Float32Array;
  ejecta: Float32Array;
  disk: Float32Array;
  fragment: Float32Array;
  /** xyz per particle: ship-local x (along heading), y (across), z = 0 hull, (0,1] exhaust age, -1 not part of the ship */
  ship: Float32Array;
  /** xyz per particle: orbit ring index (0 = innermost), base angle, 1 = part of the ring's bead; x = -1 when not on a ring */
  orbit: Float32Array;
  /** the first nameSlots particles may carry name points; the next faceSlots carry portrait points */
  nameSlots: number;
  faceSlots: number;
}

/** Particles that form the spacecraft: the first SHIP_HULL are hull, the next SHIP_EXHAUST are exhaust. */
export const SHIP_HULL = 360;
export const SHIP_EXHAUST = 240;
export const SHIP_COUNT = SHIP_HULL + SHIP_EXHAUST;

/** Orbit marks for the Experience chapter: one ring per timeline entry, each with a bead. They follow the ship in the buffer. */
export const ORBIT_RINGS = 5;
export const ORBIT_RING_POINTS = 440;
export const ORBIT_BEAD_POINTS = 60;
export const ORBIT_PER_RING = ORBIT_RING_POINTS + ORBIT_BEAD_POINTS;
export const ORBIT_COUNT = ORBIT_RINGS * ORBIT_PER_RING;
/** Where each ring's bead sits at time zero (radians), spread so no two beads line up. */
export const beadAngle = (ring: number): number => 0.6 + ring * 1.35;

/** Delta-wing dart in local coordinates: nose at x = 0.5, tail at x = -0.5, half-height 0.22. */
export function inShip(x: number, y: number): boolean {
  if (x < -0.5 || x > 0.5) return false;
  const body = 0.1 * (0.5 - x);
  const fin = x < -0.1 ? 0.22 * ((-0.1 - x) / 0.4) : 0;
  if (Math.abs(y) > Math.max(body, fin)) return false;
  if (x < -0.45 && Math.abs(y) < 0.04) return false; // engine nozzle gap
  return true;
}

export function generateParticles(count: number, projectCount: number, seed = 1337): ParticleBuffers {
  const rnd = mulberry32(seed);
  const out: ParticleBuffers = {
    count,
    seed: new Float32Array(4 * count),
    star: new Float32Array(3 * count),
    ejecta: new Float32Array(4 * count),
    disk: new Float32Array(4 * count),
    fragment: new Float32Array(count),
    ship: new Float32Array(3 * count).fill(-1),
    orbit: new Float32Array(3 * count).fill(-1),
    nameSlots: Math.round(SLOTS.name * count),
    faceSlots: Math.round(SLOTS.face * count),
  };

  // spacecraft: hull points by rejection sampling, exhaust points trailing behind the nozzle
  const shipCount = Math.min(SHIP_COUNT, count);
  for (let i = 0; i < shipCount; i++) {
    if (i < SHIP_HULL) {
      let x = 0, y = 0;
      do {
        x = rnd() - 0.5;
        y = (rnd() - 0.5) * 0.5;
      } while (!inShip(x, y));
      out.ship[3 * i] = x;
      out.ship[3 * i + 1] = y;
      out.ship[3 * i + 2] = 0;
    } else {
      const age = Math.pow(rnd(), 1.6); // dense near the nozzle, sparse far behind
      out.ship[3 * i] = -0.55 - 1.8 * age;
      out.ship[3 * i + 1] = (rnd() - 0.5) * (0.06 + 0.16 * age);
      out.ship[3 * i + 2] = 0.02 + 0.98 * age;
    }
  }
  const TAU = Math.PI * 2;

  // orbit marks: evenly spaced ring points plus a tight bead cluster per ring
  const orbitStart = shipCount;
  const orbitEnd = Math.min(orbitStart + ORBIT_COUNT, count);
  for (let i = orbitStart; i < orbitEnd; i++) {
    const k = i - orbitStart;
    const ring = Math.floor(k / ORBIT_PER_RING);
    const j = k % ORBIT_PER_RING;
    const bead = j < ORBIT_BEAD_POINTS;
    const gauss = rnd() + rnd() + rnd() - 1.5; // roughly normal in [-1.5, 1.5]
    out.orbit[3 * i] = ring;
    out.orbit[3 * i + 1] = bead ? beadAngle(ring) + gauss * 0.035 : ((j - ORBIT_BEAD_POINTS) / ORBIT_RING_POINTS) * TAU + (rnd() - 0.5) * 0.01;
    out.orbit[3 * i + 2] = bead ? 1 : 0;
  }

  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 4; k++) out.seed[4 * i + k] = rnd();

    // star: uniform direction, radius weighted toward the surface (r = u^(1/6))
    const z = 2 * rnd() - 1;
    const phi = TAU * rnd();
    const s = Math.sqrt(1 - z * z);
    const dx = s * Math.cos(phi), dy = s * Math.sin(phi), dz = z;
    const r = Math.pow(rnd(), 1 / 6);
    out.star[3 * i] = dx * r;
    out.star[3 * i + 1] = dy * r;
    out.star[3 * i + 2] = dz * r;

    // ejecta: direction perturbed by noise sampled at the direction (correlated, so it forms filaments)
    const nx = valueNoise3(dx * 2.5 + 11, dy * 2.5 + 7, dz * 2.5 + 3) - 0.5;
    const ny = valueNoise3(dx * 2.5 + 29, dy * 2.5 + 17, dz * 2.5 + 5) - 0.5;
    const nz = valueNoise3(dx * 2.5 + 41, dy * 2.5 + 23, dz * 2.5 + 13) - 0.5;
    let ex = dx + 0.7 * nx, ey = dy + 0.7 * ny, ez = dz + 0.7 * nz;
    const el = Math.hypot(ex, ey, ez) || 1;
    ex /= el; ey /= el; ez /= el;
    // speed lanes: noise-correlated so neighbouring directions share speed (Rayleigh-Taylor fingers)
    const lane = valueNoise3(ex * 3.1 + 7.7, ey * 3.1 + 1.3, ez * 3.1 + 9.1);
    const speed = 0.6 + 0.8 * Math.min(1, Math.max(0, lane * 1.2 - 0.1));
    out.ejecta[4 * i] = ex;
    out.ejecta[4 * i + 1] = ey;
    out.ejecta[4 * i + 2] = ez;
    out.ejecta[4 * i + 3] = speed;

    // disk: r = 3 + 9 u^2 (denser inward), phase, vertical jitter, fallback flag
    const u = rnd();
    out.disk[4 * i] = 3 + 9 * u * u;
    out.disk[4 * i + 1] = TAU * rnd();
    out.disk[4 * i + 2] = (rnd() + rnd() + rnd() - 1.5) * 0.06;
    out.disk[4 * i + 3] = rnd() < 0.3 ? 1 : 0;

    // fragment: azimuth sector of the ejecta direction
    const az = (Math.atan2(ey, ex) + Math.PI) / TAU;
    out.fragment[i] = Math.min(projectCount - 1, Math.floor(az * projectCount));
  }
  return out;
}
