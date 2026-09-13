import { describe, expect, it } from 'vitest';
import { sectionProgress } from './scroll';

describe('sectionProgress', () => {
  it('is 0 when the section top sits at the viewport centre and 1 when its bottom does', () => {
    const vh = 1000;
    expect(sectionProgress(500, 800, vh)).toBeCloseTo(0);
    expect(sectionProgress(-300, 800, vh)).toBeCloseTo(1);
    expect(sectionProgress(100, 800, vh)).toBeCloseTo(0.5);
  });
  it('clamps outside the section', () => {
    expect(sectionProgress(900, 800, 1000)).toBe(0);
    expect(sectionProgress(-2000, 800, 1000)).toBe(1);
  });
});
