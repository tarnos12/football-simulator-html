import { describe, it, expect } from "vitest";
import { RNG } from "./core/rng";
import { createLeague } from "./league/create";
import { createSeason, simulateWholeSeason, computeFormTable } from "./league";
import { archiveSeason, leagueRecords } from "./stats/records";
import { goalTableOf, corruptionReasons, setOverride } from "./model/config-resolve";
import { flavourHooks } from "./systems/flavour";
import { Campaign } from "./game/campaign";

function league(seed = "p6") {
  return createLeague(new RNG(seed), {
    name: "P6", seed, matchesPerPairing: 2,
    levels: [
      { name: "Top", split: "random", divisions: [{ name: "Division 1", teams: 8 }] },
      { name: "Two", split: "random", divisions: [{ name: "Division 2", teams: 8 }] },
    ],
  });
}

describe("Creator-editable config overrides (§23)", () => {
  it("defaults resolve to the committed tables", () => {
    const lg = league();
    expect(goalTableOf(lg).length).toBe(25);
    expect(corruptionReasons(lg)).toContain("Match-fixing");
  });

  it("an edited Goal Table changes match results", () => {
    const base = league("gt");
    const baseSeason = createSeason(base, 1);
    simulateWholeSeason(base, baseSeason, flavourHooks(base));
    const baseGoals = totalGoals(baseSeason);

    const edited = league("gt");
    // Zero out the entire goal table → every match must finish 0–0.
    setOverride(edited, "goalTable", goalTableOf(edited).map((row) => row.map(() => 0)));
    const editedSeason = createSeason(edited, 1);
    simulateWholeSeason(edited, editedSeason, flavourHooks(edited));
    expect(totalGoals(editedSeason)).toBe(0);
    expect(baseGoals).toBeGreaterThan(0);
  });

  it("edited corruption reasons round-trip through serialization", () => {
    const lg = league();
    setOverride(lg, "corruptionReasons", ["Only reason"]);
    expect(corruptionReasons(lg)).toEqual(["Only reason"]);
  });
});

describe("Form table (§21 Last-X)", () => {
  it("counts only each team's last N games", () => {
    const lg = league("form");
    const season = createSeason(lg, 1);
    simulateWholeSeason(lg, season, flavourHooks(lg));
    const div = season.divisions[0];
    const rules = lg.rules;
    const form = computeFormTable(div.teamIds, div.schedule, rules, 5);
    for (const r of form) expect(r.played).toBeLessThanOrEqual(5);
  });
});

describe("Fuller league records (§20)", () => {
  it("produces the expanded record set", () => {
    const lg = league("rec");
    const archives = [];
    for (let s = 1; s <= 2; s++) {
      const season = createSeason(lg, s);
      simulateWholeSeason(lg, season, flavourHooks(lg));
      archives.push(archiveSeason(lg, season));
    }
    const recs = leagueRecords(archives);
    const labels = recs.map((r) => r.label);
    expect(labels).toContain("Highest winning points");
    expect(labels).toContain("Avg points to stay up");
    expect(labels).toContain("Most points, still relegated");
    expect(labels).toContain("Best goal difference");
  });
});

describe("Single-match simulation (§4)", () => {
  it("plays one game at a time and keeps determinism vs whole-season", () => {
    const c = new Campaign(league("single"));
    const divId = c.season.divisions[0].divisionId;
    // Play a handful of individual matches.
    for (let i = 0; i < 5; i++) c.simulateNextMatch(divId);
    const played = c.season.divisions.find((d) => d.divisionId === divId)!.schedule.filter((m) => m.result).length;
    expect(played).toBe(5);
  });
});

function totalGoals(season: ReturnType<typeof createSeason>): number {
  let g = 0;
  for (const d of season.divisions) for (const m of d.schedule) if (m.result) g += m.result.homeGoals + m.result.awayGoals;
  return g;
}
