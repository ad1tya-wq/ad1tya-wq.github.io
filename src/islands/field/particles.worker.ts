import { generateParticles, type ParticleBuffers } from './particles';

export interface ParticleRequest {
  count: number;
  projectCount: number;
}

// Generation is pure CPU work (noise per particle); doing it off the main thread keeps startup responsive.
self.onmessage = (e: MessageEvent<ParticleRequest>) => {
  const p: ParticleBuffers = generateParticles(e.data.count, e.data.projectCount);
  (self as unknown as Worker).postMessage(p, [p.seed.buffer, p.star.buffer, p.ejecta.buffer, p.disk.buffer, p.fragment.buffer, p.ship.buffer, p.orbit.buffer]);
};
