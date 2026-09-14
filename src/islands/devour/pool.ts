/** A ring of particle slots: allocations are contiguous and the oldest are evicted when the ring wraps. */
export interface Allocation {
  id: number;
  from: number;
  to: number;
}

export class RingPool {
  private head = 0;
  private live: Allocation[] = [];
  constructor(readonly size: number) {}

  /** Reserves n slots for id; returns the range and the ids that had to be evicted to make room. */
  alloc(id: number, n: number): { from: number; to: number; evicted: number[] } {
    const count = Math.min(n, this.size);
    if (this.head + count > this.size) this.head = 0; // wrap: never split a block
    const from = this.head;
    const to = from + count;
    this.head = to % this.size;
    const evicted: number[] = [];
    this.live = this.live.filter((a) => {
      const overlaps = a.from < to && a.to > from;
      if (overlaps) evicted.push(a.id);
      return !overlaps;
    });
    this.live.push({ id, from, to });
    return { from, to, evicted };
  }

  free(id: number): Allocation | undefined {
    const a = this.live.find((x) => x.id === id);
    this.live = this.live.filter((x) => x.id !== id);
    return a;
  }

  get(id: number): Allocation | undefined {
    return this.live.find((x) => x.id === id);
  }
}
