import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import type { Coach, Team } from "../model/types";
import { penaltyHomeWinProbability, simulateShootout, resolveDecider } from "./decider";
import { defaultRules } from "../config";
import type { MatchContext } from "./match";

function coach(skill: number, attributes: Coach["attributes"] = []): Coach {
  return { name: "C", skill, attributes, yearsInPost: 1 };
}
function team(id: string, c: Coach): Team {
  return {
    id, name: id, attack: 5, defence: 5, stamina: 5, form: 0, coach: c,
    clubSize: 5, organisation: 5, ownership: "capitalistic",
    location: { x: 1, y: 1 },
    jersey: { shirtColors: ["#fff", "#000"], shirtPattern: "One color", shortColors: ["#fff", "#000"] },
  };
}

describe("Penalties (§15)", () => {
  it("is 50/50 with no coach traits", () => {
    expect(penaltyHomeWinProbability(coach(3), coach(3))).toBe(0.5);
  });
  it("Ice cold lifts the home side to 70%", () => {
    expect(penaltyHomeWinProbability(coach(3, ["penaltyUp"]), coach(3))).toBeCloseTo(0.7);
  });
  it("Cursed drops the home side to 30%", () => {
    expect(penaltyHomeWinProbability(coach(3, ["penaltyDown"]), coach(3))).toBeCloseTo(0.3);
  });
  it("away Ice cold lowers home probability", () => {
    expect(penaltyHomeWinProbability(coach(3), coach(3, ["penaltyUp"]))).toBeCloseTo(0.3);
  });

  it("shootout always yields a winner matching the decided side", () => {
    for (let i = 0; i < 200; i++) {
      const rng = new RNG(`p${i}`);
      const homeWins = i % 2 === 0;
      const s = simulateShootout(rng, homeWins);
      expect(s.home).not.toBe(s.away);
      expect(s.home > s.away).toBe(homeWins);
    }
  });
});

describe("Decider (§15)", () => {
  const ctx: MatchContext = { rules: { ...defaultRules(), homeAdvantage: false }, weather: "sunny" };
  it("always names a winner and is deterministic", () => {
    const h = team("H", coach(3));
    const a = team("A", coach(3));
    const o1 = resolveDecider(h, a, ctx, new RNG("dec"));
    const o2 = resolveDecider(h, a, ctx, new RNG("dec"));
    expect(o1).toEqual(o2);
    expect([h.id, a.id]).toContain(o1.winnerId);
  });
});
