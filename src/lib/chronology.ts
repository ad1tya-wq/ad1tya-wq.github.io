/** Chronology helpers for the timeline: which entry is most recent decides its orbit ring. */

/** First four-digit year in a date string ("May 2026 to July 2026" -> 2026); NaN when there is none. */
export function startYear(dates: string): number {
  const m = dates.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : NaN;
}

/**
 * Ring index per entry: 0 for the most recent start, rising with age. Ties keep their input order,
 * so an entry listed first among equals sits one ring closer in.
 */
export function orbitIndices(dates: string[]): number[] {
  const order = dates
    .map((d, i) => ({ i, y: startYear(d) }))
    .sort((a, b) => (isNaN(a.y) ? 1 : isNaN(b.y) ? -1 : b.y - a.y || a.i - b.i));
  const out = new Array<number>(dates.length);
  order.forEach((o, ring) => (out[o.i] = ring));
  return out;
}
