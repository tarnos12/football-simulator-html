import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import { buildLeagueSystem } from "./factory";
import {
  serializeLeague,
  deserializeLeague,
  encodeShareCode,
  decodeShareCode,
  stableStringify,
} from "./serialize";

function demoLeague(seed = "phase1") {
  return buildLeagueSystem(new RNG(seed), {
    name: "Phase 1 League",
    seed,
    matchesPerPairing: 2,
    split: "random",
    levels: [
      { name: "Top", divisions: [{ name: "Div 1", teams: 10 }, { name: "Div 1B", teams: 10 }] },
      { name: "Second", divisions: [{ name: "Div 2", teams: 12 }] },
    ],
  });
}

describe("Serialization round-trip (§22 — 100% shareable)", () => {
  it("serialize → deserialize → serialize is byte-identical", () => {
    const league = demoLeague();
    const once = serializeLeague(league);
    const twice = serializeLeague(deserializeLeague(once));
    expect(twice).toBe(once);
  });

  it("deserialize reproduces a structurally identical object", () => {
    const league = demoLeague();
    const restored = deserializeLeague(serializeLeague(league));
    expect(restored).toEqual(league);
  });

  it("share code round-trips losslessly", () => {
    const league = demoLeague("share");
    const restored = decodeShareCode(encodeShareCode(league));
    expect(serializeLeague(restored)).toBe(serializeLeague(league));
  });

  it("stableStringify is insensitive to key insertion order", () => {
    const a = { b: 1, a: 2, c: { z: 1, y: 2 } };
    const b = { c: { y: 2, z: 1 }, a: 2, b: 1 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("same seed builds byte-identical leagues; different seed differs", () => {
    expect(serializeLeague(demoLeague("x"))).toBe(serializeLeague(demoLeague("x")));
    expect(serializeLeague(demoLeague("x"))).not.toBe(serializeLeague(demoLeague("y")));
  });

  it("rejects a schema version from the future", () => {
    const league = demoLeague();
    league.schemaVersion = 9999;
    expect(() => deserializeLeague(serializeLeague(league))).toThrow(/schema/);
  });
});
