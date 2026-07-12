import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import { serializeLeague } from "../model/serialize";
import { createLeague } from "./create";
import { generateSchedule, singleRoundRobin, roundCount } from "./schedule";
import { computeTable, orderTable } from "./standings";
import {
  createSeason,
  simulateWholeSeason,
  simulateSystemRound,
  isSeasonComplete,
} from "./season";
import type { MatchResult } from "../model/types";
import { applyPromotionRelegation } from "./promotion";
import { seasonSummary } from "./summary";
import { defaultRules } from "../config";

function demoLeague(seed = "phase3") {
  return createLeague(new RNG(seed), {
    name: "Test League",
    seed,
    matchesPerPairing: 2,
    levels: [
      { name: "Tier 1", split: "random", divisions: [{ name: "Division 1", teams: 8 }] },
      { name: "Tier 2", split: "random", divisions: [{ name: "Division 2", teams: 8 }] },
    ],
    promotionCount: 2,
    relegationCount: 2,
  });
}

describe("Scheduling (§6)", () => {
  it("single round-robin: every pair meets exactly once", () => {
    const teams = ["a", "b", "c", "d", "e", "f"];
    const rounds = singleRoundRobin(teams);
    expect(rounds.length).toBe(teams.length - 1);
    const pairSeen = new Set<string>();
    for (const round of rounds) {
      for (const [h, a] of round) {
        const key = [h, a].sort().join("|");
        expect(pairSeen.has(key)).toBe(false);
        pairSeen.add(key);
      }
    }
    expect(pairSeen.size).toBe((teams.length * (teams.length - 1)) / 2);
  });

  it("double round-robin: each pairing plays home and away", () => {
    const teams = ["a", "b", "c", "d"];
    const schedule = generateSchedule(teams, 2, false);
    // 4 teams × 3 opponents × 2 legs / 2 per match = 12 matches
    expect(schedule.length).toBe(12);
    // Each ordered (home,away) appears once.
    const seen = new Set(schedule.map((m) => `${m.homeId}>${m.awayId}`));
    expect(seen.size).toBe(12);
    expect(roundCount(schedule)).toBe(6);
  });

  it("handles an odd number of teams with byes", () => {
    const schedule = generateSchedule(["a", "b", "c", "d", "e"], 2, false);
    // 5 teams: each plays 4 opponents × 2 = 8 games → 20 team-games → 20/...
    const perTeam = new Map<string, number>();
    for (const m of schedule) {
      perTeam.set(m.homeId, (perTeam.get(m.homeId) ?? 0) + 1);
      perTeam.set(m.awayId, (perTeam.get(m.awayId) ?? 0) + 1);
    }
    for (const count of perTeam.values()) expect(count).toBe(8);
  });
});

describe("Standings (§7)", () => {
  it("awards points and orders by points then goal difference", () => {
    const rules = defaultRules();
    const schedule = [
      { round: 1, homeId: "a", awayId: "b", result: mkResult("a", "b", 3, 0) },
      { round: 1, homeId: "c", awayId: "d", result: mkResult("c", "d", 1, 1) },
      { round: 2, homeId: "a", awayId: "c", result: mkResult("a", "c", 2, 2) },
      { round: 2, homeId: "b", awayId: "d", result: mkResult("b", "d", 0, 1) },
    ];
    const table = orderTable(computeTable(["a", "b", "c", "d"], schedule, rules), schedule, rules);
    expect(table[0].teamId).toBe("a"); // 4 pts, +3 gd (3-0, 2-2)
    expect(table[0].points).toBe(4);
    expect(table[0].goalsFor - table[0].goalsAgainst).toBe(3);
  });
});

describe("Full season end-to-end (§ Phase 3 gate)", () => {
  it("simulates a whole season; every match played, table sums correctly", () => {
    const league = demoLeague();
    const season = createSeason(league, 1);
    simulateWholeSeason(league, season);
    expect(isSeasonComplete(season)).toBe(true);
    for (const div of season.divisions) {
      const totalGames = div.schedule.length;
      const played = div.schedule.filter((m) => m.result).length;
      expect(played).toBe(totalGames);
      // Sum of games played across the table = 2 × matches.
      const sumPlayed = div.table.reduce((s, r) => s + r.played, 0);
      expect(sumPlayed).toBe(totalGames * 2);
      // Position history length equals rounds.
      expect(div.table[0].positionHistory.length).toBe(div.totalRounds);
    }
  });

  it("is deterministic regardless of simulation granularity", () => {
    const leagueA = demoLeague("gran");
    const seasonA = createSeason(leagueA, 1);
    simulateWholeSeason(leagueA, seasonA);

    const leagueB = demoLeague("gran");
    const seasonB = createSeason(leagueB, 1);
    // Simulate round-by-round instead of all at once.
    while (!isSeasonComplete(seasonB)) simulateSystemRound(leagueB, seasonB);

    const tablesA = seasonA.divisions.map((d) => d.table.map((r) => [r.teamId, r.points, r.goalsFor, r.goalsAgainst]));
    const tablesB = seasonB.divisions.map((d) => d.table.map((r) => [r.teamId, r.points, r.goalsFor, r.goalsAgainst]));
    expect(tablesA).toEqual(tablesB);
  });

  it("resolves promotion and relegation between the two tiers", () => {
    const league = demoLeague("prorel");
    const season = createSeason(league, 1);
    simulateWholeSeason(league, season);
    const summary = seasonSummary(league, season);

    const topDiv = summary.divisions[0];
    const bottomDiv = summary.divisions[1];
    expect(topDiv.championId).toBeDefined();
    expect(bottomDiv.promoted.length).toBe(2);
    expect(topDiv.relegated.length).toBe(2);

    const { league: next, changes } = applyPromotionRelegation(league, season, new RNG("prorel-move"));
    // Relegated teams from the top are now in the second tier and vice versa.
    const topTeams = new Set(next.levels[0].divisions.flatMap((d) => d.teamIds));
    for (const t of topDiv.relegated) expect(topTeams.has(t)).toBe(false);
    for (const t of bottomDiv.promoted) expect(topTeams.has(t)).toBe(true);
    // Division sizes preserved.
    expect(next.levels[0].divisions[0].teamIds.length).toBe(8);
    expect(next.levels[1].divisions[0].teamIds.length).toBe(8);
    expect(changes.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Geographic distribution (§6)", () => {
  it("splits a level's teams by latitude", () => {
    const league = createLeague(new RNG("geo"), {
      name: "Geo",
      seed: "geo",
      matchesPerPairing: 2,
      levels: [
        { name: "Regional", split: "geographic", divisions: [{ name: "North", teams: 6 }, { name: "South", teams: 6 }] },
      ],
    });
    const north = league.levels[0].divisions[0].teamIds.map((id) => league.teams[id].location.y);
    const south = league.levels[0].divisions[1].teamIds.map((id) => league.teams[id].location.y);
    const minNorth = Math.min(...north);
    const maxSouth = Math.max(...south);
    expect(minNorth).toBeGreaterThanOrEqual(maxSouth);
  });
});

describe("Determinism of created leagues", () => {
  it("same seed builds byte-identical leagues", () => {
    expect(serializeLeague(demoLeague("z"))).toBe(serializeLeague(demoLeague("z")));
  });
});

function mkResult(homeId: string, awayId: string, hg: number, ag: number): MatchResult {
  return {
    homeId, awayId, homeGoals: hg, awayGoals: ag, halftimeHome: 0, halftimeAway: 0,
    halves: [
      { homeGoals: 0, awayGoals: 0, homeRoll: 0, awayRoll: 0, homeDiff: 0, awayDiff: 0 },
      { homeGoals: hg, awayGoals: ag, homeRoll: 0, awayRoll: 0, homeDiff: 0, awayDiff: 0 },
    ],
    weather: "sunny", attendance: 0, neutralGround: false, derby: false,
    motivationHome: false, motivationAway: false, incidents: [],
  };
}
