import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import { defaultRules, type LeagueRules } from "../config";
import type { Coach, Team } from "../model/types";
import { resolveMatch, formatScore, type MatchContext } from "./match";

/** RNG that returns scripted values so we can reproduce the workbook example. */
class ScriptedRNG extends RNG {
  private ints: number[];
  private rolls: number[];
  constructor(ints: number[], rolls: number[]) {
    super("scripted");
    this.ints = [...ints];
    this.rolls = [...rolls];
  }
  override int(): number {
    return this.ints.shift()!;
  }
  override roll2d6(): number {
    return this.rolls.shift()!;
  }
}

function coach(skill: number): Coach {
  return { name: "C", skill, attributes: [], yearsInPost: 1 };
}

function team(id: string, att: number, def: number, sta: number, form: number, skill: number): Team {
  return {
    id,
    name: id,
    attack: att,
    defence: def,
    stamina: sta,
    form,
    coach: coach(skill),
    clubSize: 5,
    organisation: 5,
    ownership: "capitalistic",
    location: { x: 1, y: 1 },
    jersey: { shirtColors: ["#fff", "#000"], shirtPattern: "One color", shortColors: ["#fff", "#000"] },
  };
}

describe("Match engine — GDD worked example (§8)", () => {
  it("reproduces Team A – Team B 4–1 (1–0)", () => {
    // Team A (home): Att5 Def2 Sta7 Form −0.25 Coach4
    // Team B (away): Att6 Def4 Sta4 Form  0.75 Coach2
    const teamA = team("A", 5, 2, 7, -0.25, 4);
    const teamB = team("B", 6, 4, 4, 0.75, 2);

    const rules: LeagueRules = {
      ...defaultRules(),
      homeAdvantage: true,
      form: true,
      weather: false,
      bigTeamAdvantage: false,
      motivation: false,
    };
    const ctx: MatchContext = { rules, weather: "sunny" };

    // Scripted: whoHasTheDay A=1, B=0; then 2D6 per half: H1 home 7 / away 6,
    // H2 home 9 / away 10.
    const rng = new ScriptedRNG([1, 0], [7, 6, 9, 10]);
    const result = resolveMatch(teamA, teamB, ctx, rng);

    expect(result.halftimeHome).toBe(1);
    expect(result.halftimeAway).toBe(0);
    expect(result.homeGoals).toBe(4);
    expect(result.awayGoals).toBe(1);
    expect(formatScore(result)).toBe("4–1 (1–0)");

    // Effective team differences fed into the goal table per the worked example.
    expect(result.halves[0].homeDiff).toBe(4);
    expect(result.halves[0].awayDiff).toBe(1);
    expect(result.halves[1].homeDiff).toBe(6);
    expect(result.halves[1].awayDiff).toBe(-1);
    // Rolls after coach adjustment.
    expect(result.halves[0].homeRoll).toBe(9); // 7 + coach diff 2
    expect(result.halves[1].homeRoll).toBe(11); // 9 + 2
  });
});

describe("Match engine — determinism", () => {
  const teamA = team("A", 6, 5, 7, 0.2, 3);
  const teamB = team("B", 5, 6, 4, -0.1, 2);
  const ctx: MatchContext = { rules: { ...defaultRules(), homeAdvantage: true, form: true }, weather: "sunny" };

  it("same seed ⇒ identical result", () => {
    const r1 = resolveMatch(teamA, teamB, ctx, new RNG("match-seed"));
    const r2 = resolveMatch(teamA, teamB, ctx, new RNG("match-seed"));
    expect(r1).toEqual(r2);
  });

  it("different seeds generally differ across a batch", () => {
    const scores = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const r = resolveMatch(teamA, teamB, ctx, new RNG(`seed-${i}`));
      scores.add(formatScore(r));
    }
    expect(scores.size).toBeGreaterThan(1);
  });

  it("produces only non-negative goals within table bounds", () => {
    for (let i = 0; i < 500; i++) {
      const r = resolveMatch(teamA, teamB, ctx, new RNG(`b-${i}`));
      expect(r.homeGoals).toBeGreaterThanOrEqual(0);
      expect(r.awayGoals).toBeGreaterThanOrEqual(0);
      expect(r.homeGoals).toBeLessThanOrEqual(14); // 7 per half max
      expect(r.homeGoals).toBe(r.halves[0].homeGoals + r.halves[1].homeGoals);
    }
  });
});

describe("Match engine — modifiers", () => {
  it("neutral ground removes home advantage (fewer home-tilted results)", () => {
    const strongHome = team("H", 7, 7, 7, 0, 3);
    const weakAway = team("A", 4, 4, 4, 0, 3);
    const homeRules: MatchContext = { rules: { ...defaultRules(), homeAdvantage: true }, weather: "sunny" };
    const neutral: MatchContext = { rules: { ...defaultRules(), homeAdvantage: true }, weather: "sunny", neutralGround: true };
    let homeAdv = 0;
    let neutralAdv = 0;
    for (let i = 0; i < 200; i++) {
      homeAdv += resolveMatch(strongHome, weakAway, homeRules, new RNG(`h${i}`)).homeGoals;
      neutralAdv += resolveMatch(strongHome, weakAway, neutral, new RNG(`h${i}`)).homeGoals;
    }
    expect(homeAdv).toBeGreaterThanOrEqual(neutralAdv);
  });

  it("heavy rain caps attack/defence at 5, compressing a lopsided match", () => {
    const monster = team("M", 9, 9, 9, 0, 5);
    const minnow = team("m", 1, 1, 1, 0, 1);
    const dry: MatchContext = { rules: { ...defaultRules(), weather: true }, weather: "sunny" };
    const rain: MatchContext = { rules: { ...defaultRules(), weather: true }, weather: "heavyRain" };
    let dryGoals = 0;
    let rainGoals = 0;
    for (let i = 0; i < 200; i++) {
      dryGoals += resolveMatch(monster, minnow, dry, new RNG(`d${i}`)).homeGoals;
      rainGoals += resolveMatch(monster, minnow, rain, new RNG(`d${i}`)).homeGoals;
    }
    expect(rainGoals).toBeLessThan(dryGoals);
  });
});
