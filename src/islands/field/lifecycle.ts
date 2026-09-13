export type ChapterId = 'top' | 'about' | 'projects' | 'skills' | 'experience' | 'horizon' | 'contact';

export interface Chapter {
  id: ChapterId;
  start: number;
  end: number;
  /** progress shown for this chapter when motion is reduced */
  poster: number;
}

export const CHAPTERS: readonly Chapter[] = [
  { id: 'top', start: 0.0, end: 0.1, poster: 0.06 },
  { id: 'about', start: 0.1, end: 0.28, poster: 0.19 },
  { id: 'projects', start: 0.28, end: 0.55, poster: 0.42 },
  { id: 'skills', start: 0.55, end: 0.68, poster: 0.62 },
  { id: 'experience', start: 0.68, end: 0.82, poster: 0.78 },
  { id: 'horizon', start: 0.82, end: 0.94, poster: 0.92 },
  { id: 'contact', start: 0.94, end: 1.0, poster: 1.0 },
];

export const MODE_TARGETS = { star: 0.08, nova: 0.19, remnant: 0.6, horizon: 0.9 } as const;
export type ModeId = keyof typeof MODE_TARGETS | 'scroll';

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Exponential approach: the same result for one 1/30 s step as for two 1/60 s steps. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function chapterProgress(id: ChapterId, local: number): number {
  const c = CHAPTERS.find((ch) => ch.id === id)!;
  return c.start + clamp01(local) * (c.end - c.start);
}

export function chapterAt(progress: number): ChapterId {
  const p = clamp01(progress);
  for (const c of CHAPTERS) if (p < c.end) return c.id;
  return 'contact';
}
