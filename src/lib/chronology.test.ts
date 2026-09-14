import { describe, expect, it } from 'vitest';
import { orbitIndices, startYear } from './chronology';

describe('startYear', () => {
  it('reads the first year in a range', () => {
    expect(startYear('May 2026 to July 2026')).toBe(2026);
    expect(startYear('2021 to 2023')).toBe(2021);
    expect(startYear('present')).toBeNaN();
  });
});

describe('orbitIndices', () => {
  it('puts the most recent start innermost and keeps input order on ties', () => {
    const dates = ['May 2026 to July 2026', '2024 to 2025', '2023 to 2027', '2021 to 2023', '2020 to 2021'];
    expect(orbitIndices(dates)).toEqual([0, 1, 2, 3, 4]);
    expect(orbitIndices(['2020 to 2021', '2024 to 2025', '2024 to present'])).toEqual([2, 0, 1]);
  });
});
