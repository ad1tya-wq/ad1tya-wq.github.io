import { describe, expect, it } from 'vitest';
import { iconPath, PICTO_ICONS } from './picto';

describe('iconPath', () => {
  it('returns the path data of a Phosphor regular icon', () => {
    const d = iconPath('flask');
    expect(d.startsWith('M')).toBe(true);
    expect(d.length).toBeGreaterThan(100);
  });
  it('throws for an unknown icon so a typo fails the build, not the page', () => {
    expect(() => iconPath('no-such-icon')).toThrow(/no-such-icon/);
  });
  it('every icon the projects use exists', () => {
    for (const name of PICTO_ICONS) expect(iconPath(name).length).toBeGreaterThan(0);
  });
});
