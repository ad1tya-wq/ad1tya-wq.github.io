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
  nameSlots: number;
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
    nameSlots: Math.round(0.55 * count),
  };
  const TAU = Math.PI * 2;

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
