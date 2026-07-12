import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import type { Team } from "../model/types";
import { createLeague } from "./create";
import { playWholeInternational, type IntlEntrant } from "./international";
import { playWholeCup, createCup, playNextCupRound } from "./cup";
import { World } from "../game/world";
import { defaultCup } from "../game/campaign";

function team(id: string, att = 5, def = 5, sta = 5): Team {
  return {
    id, name: id, attack: att, defence: def, stamina: sta, form: 0,
    coach: { name: "C", skill: 3, attributes: [], yearsInPost: 1 },
    clubSize: 5, organisation: 5, ownership: "capitalistic", location: { x: 1, y: 1 },
    jersey: { shirtColors: ["#fff", "#000"], shirtPattern: "One color", shortColors: ["#fff", "#000"] },
  };
}

describe("International competitions (§19)", () => {
  it("league strength favours the stronger league even with equal base stats", () => {
    let strongWins = 0;
    for (let i = 0; i < 100; i++) {
      const entrants: IntlEntrant[] = [
        { id: "strong", team: team("strong"), leagueName: "A", strength: 9 },
        { id: "weak", team: team("weak"), leagueName: "B", strength: 1 },
      ];
      const state = playWholeInternational("Cup", entrants, `s${i}`);
      if (state.championId === "strong") strongWins++;
    }
    expect(strongWins).toBeGreaterThan(75);
  });

  it("produces a single champion and is deterministic", () => {
    const entrants: IntlEntrant[] = Array.from({ length: 8 }, (_, i) => ({
      id: `t${i}`, team: team(`t${i}`, 4 + (i % 5)), leagueName: `L${i % 3}`, strength: 1 + (i % 9),
    }));
    const a = playWholeInternational("Cup", entrants, "seed");
    const b = playWholeInternational("Cup", entrants, "seed");
    expect(a.championId).toBeDefined();
    expect(a.championId).toBe(b.championId);
    expect(a.complete).toBe(true);
  });
});

describe("World of countries (§19)", () => {
  it("runs several countries and an international cup between them", () => {
    const world = new World({ seed: "w", countryCount: 4, teamsPerDivision: 6, teamsPerCountry: 2 });
    expect(world.countries.length).toBe(4);
    world.simulateAllSeasons();
    expect(world.allSeasonsComplete()).toBe(true);
    world.runInternational();
    expect(world.international?.complete).toBe(true);
    expect(world.international?.championId).toBeDefined();
    // 4 countries × 2 teams = 8 entrants.
    expect(Object.keys(world.international!.entrants).length).toBe(8);
  });

  it("advances all countries to the next season", () => {
    const world = new World({ seed: "w2", countryCount: 3, teamsPerDivision: 6, teamsPerCountry: 1 });
    world.simulateAllSeasons();
    world.runInternational();
    world.advanceAll();
    expect(world.seasonNumber).toBe(2);
    expect(world.international).toBeNull();
    expect(world.countries.every((c) => c.campaign.seasonNumber === 2)).toBe(true);
  });
});

describe("Cup refinements (§14)", () => {
  const league = createLeague(new RNG("cup8"), {
    name: "Cup8", seed: "cup8", matchesPerPairing: 2,
    levels: [{ name: "T", split: "random", divisions: [{ name: "D", teams: 16 }] }],
  });
  const ids = Object.keys(league.teams);

  it("auto-pass byes skip the first knockout round", () => {
    const byes = ids.slice(0, 8);
    const cfg = { ...defaultCup(league), format: "knockout" as const, byeTeamIds: byes };
    const state = createCup(league, cfg, 1);
    // Round 1 only contains the 8 non-bye teams.
    const round1Teams = state.rounds[0].ties.flatMap((t) => [t.homeId, t.awayId]);
    expect(round1Teams.length).toBe(8);
    for (const b of byes) expect(round1Teams).not.toContain(b);
    // After round 1, byes are injected for round 2.
    playNextCupRound(league, state, cfg, 1);
    const round2Teams = state.rounds[1].ties.flatMap((t) => [t.homeId, t.awayId]);
    for (const b of byes) expect(round2Teams).toContain(b);
  });

  it("group seeding spreads seeded teams across groups", () => {
    const seeds = ids.slice(0, 4);
    const cfg = { ...defaultCup(league), format: "groupThenKnockout" as const, groupSize: 4, seedTeamIds: seeds };
    const state = createCup(league, cfg, 1);
    // Each seed lands in a distinct group.
    const seedGroups = seeds.map((s) => state.groupOf[s]);
    expect(new Set(seedGroups).size).toBe(seeds.length);
  });

  it("a whole cup still crowns a champion with byes", () => {
    const cfg = { ...defaultCup(league), format: "knockout" as const, byeTeamIds: ids.slice(0, 8) };
    const state = playWholeCup(league, cfg, 1);
    expect(state.complete).toBe(true);
    expect(state.championId).toBeDefined();
  });
});
