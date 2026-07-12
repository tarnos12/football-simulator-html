/**
 * Seeded, deterministic pseudo-random number generator.
 *
 * The whole simulation MUST be reproducible: a league + seed always replays
 * identically (required for sharing and for browsing back through results).
 * This is the ONLY source of randomness in `sim/`, `systems/`, and `league/`.
 * No `Math.random` and no wall-clock time may appear anywhere in sim code.
 *
 * Algorithm: `xmur3` string hash to derive the 32-bit state, then `mulberry32`
 * as the stream. Both are small, fast, well-distributed, and — crucially —
 * fully deterministic and serialisable so a run can be replayed byte-for-byte.
 */

/** Hash an arbitrary seed string into a 32-bit unsigned integer state. */
function xmur3(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export class RNG {
  private state: number;
  readonly seed: string;

  constructor(seed: string | number) {
    this.seed = String(seed);
    this.state = typeof seed === "number" ? seed >>> 0 : xmur3(this.seed);
  }

  /** Current internal state — capture with this, restore with `setState`. */
  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }

  /** Fork a fresh, independent stream deterministically derived from this one. */
  fork(label: string): RNG {
    const child = new RNG(`${this.seed}::${label}`);
    // Mix in the current state so forks at different points differ.
    child.setState((xmur3(label) ^ this.state) >>> 0);
    return child;
  }

  /** Next float in [0, 1). mulberry32. */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Single six-sided die, 1–6. */
  d6(): number {
    return this.int(1, 6);
  }

  /** Sum of two six-sided dice, 2–12. */
  roll2d6(): number {
    return this.d6() + this.d6();
  }

  /** True with the given probability `p` in [0, 1]. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Uniformly pick one element. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /**
   * Weighted pick. `weights[i]` is the (relative) probability of `items[i]`.
   * Weights need not sum to 1; they are normalised internally.
   */
  weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  /**
   * Pick an index from a discrete distribution whose probabilities sum to ~1.
   * Returns the index into `probabilities`.
   */
  weightedIndex(probabilities: readonly number[]): number {
    let r = this.next();
    for (let i = 0; i < probabilities.length; i++) {
      r -= probabilities[i];
      if (r < 0) return i;
    }
    return probabilities.length - 1;
  }

  /** In-place Fisher–Yates shuffle; returns the same array for convenience. */
  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
}

/** Convenience factory. */
export function makeRng(seed: string | number): RNG {
  return new RNG(seed);
}
