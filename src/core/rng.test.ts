import { describe, it, expect } from "vitest";
import { RNG } from "./rng";

describe("RNG determinism", () => {
  it("produces an identical stream for the same seed", () => {
    const a = new RNG("seed-123");
    const b = new RNG("seed-123");
    const streamA = Array.from({ length: 100 }, () => a.next());
    const streamB = Array.from({ length: 100 }, () => b.next());
    expect(streamA).toEqual(streamB);
  });

  it("produces different streams for different seeds", () => {
    const a = Array.from({ length: 50 }, (_, __) => 0).map(() => new RNG("A").next());
    const one = new RNG("A");
    const two = new RNG("B");
    const sa = Array.from({ length: 50 }, () => one.next());
    const sb = Array.from({ length: 50 }, () => two.next());
    expect(sa).not.toEqual(sb);
    expect(a.length).toBe(50);
  });

  it("save/restore state resumes the same stream", () => {
    const rng = new RNG("resume");
    for (let i = 0; i < 10; i++) rng.next();
    const state = rng.getState();
    const expected = Array.from({ length: 20 }, () => rng.next());
    const restored = new RNG("resume");
    restored.setState(state);
    const actual = Array.from({ length: 20 }, () => restored.next());
    expect(actual).toEqual(expected);
  });

  it("int() stays within inclusive bounds", () => {
    const rng = new RNG("bounds");
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(1, 9);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it("2D6 stays within 2..12", () => {
    const rng = new RNG("dice");
    for (let i = 0; i < 1000; i++) {
      const v = rng.roll2d6();
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(12);
    }
  });

  it("weightedIndex respects a degenerate distribution", () => {
    const rng = new RNG("weight");
    for (let i = 0; i < 100; i++) {
      expect(rng.weightedIndex([0, 1, 0])).toBe(1);
    }
  });

  it("forks are independent and reproducible", () => {
    const parent = new RNG("parent");
    parent.next();
    const f1 = parent.fork("weather").next();
    const parent2 = new RNG("parent");
    parent2.next();
    const f2 = parent2.fork("weather").next();
    expect(f1).toBe(f2);
  });
});
