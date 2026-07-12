import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import { createLeague } from "../league/create";
import { createSeason, simulateWholeSeason } from "../league/season";
import { archiveSeason, allTimeTable, mostChampionships, extremeResults, longestStreaks, headToHead } from "./records";

function run3Seasons() {
  const league = createLeague(new RNG("stats"), {
    name: "Stats League",
    seed: "stats",
    matchesPerPairing: 2,
    levels: [{ name: "Top", split: "random", divisions: [{ name: "Division 1", teams: 8 }] }],
  });
  const archives = [];
  for (let s = 1; s <= 3; s++) {
    const season = createSeason(league, s);
    simulateWholeSeason(league, season);
    archives.push(archiveSeason(league, season));
  }
  return { league, archives };
}

describe("Statistics & history (§20)", () => {
  it("archives seasons and builds an all-time table", () => {
    const { archives } = run3Seasons();
    const table = allTimeTable(archives);
    expect(table.length).toBe(8);
    // Every team played 3 seasons of a 14-game double round-robin.
    for (const row of table) {
      expect(row.seasons).toBe(3);
      expect(row.played).toBe(3 * 14);
    }
    // Sorted by points descending.
    for (let i = 1; i < table.length; i++) {
      expect(table[i - 1].points).toBeGreaterThanOrEqual(table[i].points);
    }
  });

  it("counts championships and finds extremes", () => {
    const { archives } = run3Seasons();
    const champs = mostChampionships(archives);
    expect(champs.reduce((s, c) => s + c.titles, 0)).toBe(3); // one champion per season
    const { biggestWin, mostGoals } = extremeResults(archives);
    expect(biggestWin).toBeDefined();
    expect(mostGoals!.totalGoals).toBeGreaterThanOrEqual(biggestWin!.margin);
  });

  it("computes streaks and head-to-head", () => {
    const { archives } = run3Seasons();
    const streaks = longestStreaks(archives);
    expect(streaks.win?.length ?? 0).toBeGreaterThan(0);
    const teams = archives[0].divisions[0].finalTable.map((r) => r.teamId);
    const h2h = headToHead(archives, teams[0], teams[1]);
    expect(h2h.games).toBe(6); // 2 per season × 3 seasons
    expect(h2h.aWins + h2h.bWins + h2h.draws).toBe(6);
  });
});
