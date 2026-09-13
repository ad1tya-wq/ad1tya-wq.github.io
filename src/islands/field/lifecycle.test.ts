import { describe, expect, it } from 'vitest';
import { CHAPTERS, MODE_TARGETS, chapterAt, chapterProgress, clamp01, damp, holeRadiusPx, lerp, smoothstep } from './lifecycle';

describe('CHAPTERS', () => {
  it('tile [0, 1] contiguously in spec order', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(['top', 'about', 'projects', 'skills', 'certificates', 'experience', 'horizon', 'contact']);
    expect(CHAPTERS[0]!.start).toBe(0);
    expect(CHAPTERS[CHAPTERS.length - 1]!.end).toBe(1);
    for (let i = 1; i < CHAPTERS.length; i++) expect(CHAPTERS[i]!.start).toBe(CHAPTERS[i - 1]!.end);
  });
  it('each poster lies inside its chapter', () => {
    for (const c of CHAPTERS) {
      expect(c.poster).toBeGreaterThanOrEqual(c.start);
      expect(c.poster).toBeLessThanOrEqual(c.end);
    }
  });
});

describe('chapterProgress', () => {
  it('maps local 0..1 onto the chapter range and clamps', () => {
    expect(chapterProgress('about', 0)).toBeCloseTo(0.1);
    expect(chapterProgress('about', 1)).toBeCloseTo(0.28);
    expect(chapterProgress('about', 0.5)).toBeCloseTo(0.19);
    expect(chapterProgress('about', -3)).toBeCloseTo(0.1);
    expect(chapterProgress('contact', 9)).toBeCloseTo(1);
  });
});

describe('chapterAt', () => {
  it('returns the chapter containing the progress, last chapter inclusive at 1', () => {
    expect(chapterAt(0)).toBe('top');
    expect(chapterAt(0.1)).toBe('about');
    expect(chapterAt(0.4)).toBe('projects');
    expect(chapterAt(0.6)).toBe('skills');
    expect(chapterAt(0.65)).toBe('certificates');
    expect(chapterAt(0.999)).toBe('contact');
    expect(chapterAt(1)).toBe('contact');
  });
});

describe('math helpers', () => {
  it('clamp01, lerp, smoothstep behave', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(lerp(2, 4, 0.5)).toBe(3);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
  it('damp approaches the target and is frame-rate independent', () => {
    const oneBig = damp(0, 1, 8, 1 / 30);
    const twoSmall = damp(damp(0, 1, 8, 1 / 60), 1, 8, 1 / 60);
    expect(oneBig).toBeCloseTo(twoSmall, 6);
    expect(oneBig).toBeGreaterThan(0);
    expect(oneBig).toBeLessThan(1);
  });
  it('MODE_TARGETS sit in the intended chapters', () => {
    expect(chapterAt(MODE_TARGETS.star)).toBe('top');
    expect(chapterAt(MODE_TARGETS.nova)).toBe('about');
    expect(chapterAt(MODE_TARGETS.remnant)).toBe('skills');
    expect(chapterAt(MODE_TARGETS.horizon)).toBe('horizon');
  });
});

describe('holeRadiusPx', () => {
  it('is zero before the horizon chapter and R * 0.16 once formed', () => {
    expect(holeRadiusPx(0.5, 150)).toBe(0);
    expect(holeRadiusPx(0.82, 150)).toBe(0);
    expect(holeRadiusPx(0.9, 150)).toBeCloseTo(24);
    expect(holeRadiusPx(1, 150)).toBeCloseTo(24);
    expect(holeRadiusPx(0.86, 150)).toBeGreaterThan(0);
    expect(holeRadiusPx(0.86, 150)).toBeLessThan(24);
  });
});
