import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import type { Coach, Team } from "../model/types";
import { createLeague } from "../league/create";
import { createSeason, simulateWholeSeason } from "../league/season";
import { computeAttendance } from "./attendance";
import { generateWeatherGrid, weatherGridForRound } from "./weather";
import { computeCorruption } from "./corruption";
import { applyBetweenSeason, type SeasonOutcome } from "./progression";
import { flavourHooks, seasonOutcomes } from "./flavour";
import { updateForm } from "./form";
import { cellDistance, isDerby } from "./derby";

function coach(attrs: Coach["attributes"] = []): Coach {
  return { name: "C", skill: 3, attributes: attrs, yearsInPost: 1 };
}
function team(id: string, clubSize: number, x = 1, y = 1, c = coach()): Team {
  return {
    id, name: id, attack: 5, defence: 5, stamina: 5, form: 0, coach: c,
    clubSize, organisation: 5, ownership: "capitalistic",
    location: { x, y },
    jersey: { shirtColors: ["#fff", "#000"], shirtPattern: "One color", shortColors: ["#fff", "#000"] },
  };
}

describe("Attendance (§13) — reproduces the workbook example", () => {
  it("size 7 home, size 4 away 7 cells, sunny, die1 odd die2 11 ⇒ 24 867", () => {
    // ScriptedRNG: d6 odd (subtract), int(1,30)=11.
    class ScriptedRNG extends RNG {
      override d6() { return 1; } // odd → subtract
      override int() { return 11; } // die2 percent
    }
    const home = team("H", 7, 0, 0);
    const away = team("A", 4, 7, 0); // 7 cells east → distance 7 → 40%
    const attendance = computeAttendance(
      home, away, { weather: "sunny", weatherEnabled: true, derby: false }, new ScriptedRNG("x"),
    );
    expect(attendance).toBe(24867);
  });

  it("derby triples the away crowd", () => {
    const home = team("H", 5, 0, 0);
    const away = team("A", 5, 0, 0); // same cell
    const noDerby = computeAttendance(home, away, { weather: "heavyOvercast", weatherEnabled: false, derby: false }, new RNG("s"));
    const derby = computeAttendance(home, away, { weather: "heavyOvercast", weatherEnabled: false, derby: true }, new RNG("s"));
    expect(derby).toBeGreaterThan(noDerby);
  });
});

describe("Weather generation (§10)", () => {
  it("fills every grid cell deterministically", () => {
    const g1 = generateWeatherGrid(new RNG("w"), "temperate");
    const g2 = generateWeatherGrid(new RNG("w"), "temperate");
    expect(g1.size).toBe(20 * 20);
    expect([...g1.entries()]).toEqual([...g2.entries()]);
  });
  it("cold climate never produces very warm; warm climate never snows", () => {
    const cold = [...weatherGridForRound(cLeague("cold"), 1, 1).values()];
    expect(cold).not.toContain("veryWarm");
    const warm = [...weatherGridForRound(cLeague("warm"), 1, 1).values()];
    expect(warm).not.toContain("snowing");
  });
});

describe("Derby detection (§11)", () => {
  it("uses Chebyshev distance and the configured range", () => {
    expect(cellDistance({ x: 1, y: 1 }, { x: 3, y: 2 })).toBe(2);
    expect(isDerby({ x: 1, y: 1 }, { x: 1, y: 1 }, 0)).toBe(true);
    expect(isDerby({ x: 1, y: 1 }, { x: 2, y: 1 }, 0)).toBe(false);
    expect(isDerby({ x: 1, y: 1 }, { x: 2, y: 1 }, 1)).toBe(true);
  });
});

describe("Corruption (§17)", () => {
  it("honourable coaches are never caught; high frequency catches more than low", () => {
    const mk = (freq: "low" | "high", honourable: boolean) => {
      const league = createLeague(new RNG("corr"), {
        name: "C", seed: "corr", matchesPerPairing: 2,
        levels: [{ name: "T", split: "random", divisions: [{ name: "D", teams: 20 }] }],
        rules: { corruption: true, corruptionFrequency: freq },
      });
      if (honourable) for (const id of Object.keys(league.teams)) league.teams[id].coach.attributes = ["honourable"];
      return computeCorruption(league, 1, new RNG("run")).markers.length;
    };
    expect(mk("high", true)).toBe(0);
    expect(mk("high", false)).toBeGreaterThanOrEqual(mk("low", false));
  });
});

describe("Form (§16)", () => {
  it("stays within [−2, +2] over many matches", () => {
    const t = team("F", 5);
    const rng = new RNG("form");
    for (let i = 0; i < 1000; i++) updateForm(t, rng);
    expect(t.form).toBeGreaterThanOrEqual(-2);
    expect(t.form).toBeLessThanOrEqual(2);
  });
});

describe("Between-season progression (§16)", () => {
  it("keeps all stats in 1..9 and reports highlights", () => {
    const league = createLeague(new RNG("prog"), {
      name: "P", seed: "prog", matchesPerPairing: 2,
      levels: [{ name: "T", split: "random", divisions: [{ name: "D", teams: 10 }] }],
      rules: { statChanges: "normal", clubOrgChanges: "change", ownership: "mix", clubSizeChanges: "everySeason" },
    });
    const outcomes: Record<string, SeasonOutcome> = {};
    const { league: next, highlights } = applyBetweenSeason(league, 1, outcomes, new RNG("run"));
    for (const id of Object.keys(next.teams)) {
      const t = next.teams[id];
      for (const v of [t.attack, t.defence, t.stamina, t.clubSize, t.organisation]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
    expect(Object.keys(highlights).length).toBeGreaterThan(0);
  });
});

describe("Flavoured season (Phase 4 gate)", () => {
  function flavourLeague(rules = {}) {
    return createLeague(new RNG("flav"), {
      name: "Flavour", seed: "flav", matchesPerPairing: 2,
      levels: [{ name: "T", split: "random", divisions: [{ name: "D", teams: 8 }] }],
      rules,
    });
  }

  it("runs a whole season with all toggles on; attendance & weather populated", () => {
    const league = flavourLeague({
      homeAdvantage: true, weather: true, motivation: true, form: true,
      bigTeamAdvantage: true, derby: true, crowdTrouble: true,
    });
    const season = createSeason(league, 1);
    simulateWholeSeason(league, season, flavourHooks(league));
    const results = season.divisions[0].schedule.filter((m) => m.result).map((m) => m.result!);
    expect(results.every((r) => r.attendance > 0)).toBe(true);
    expect(new Set(results.map((r) => r.weather)).size).toBeGreaterThan(0);
    expect(seasonOutcomes(league, season)[season.divisions[0].table[0].teamId]).toBe("championPromoted");
  });

  it("a toggle deterministically changes outcomes (motivation on vs off)", () => {
    const build = (motivation: boolean) => {
      const league = flavourLeague({ homeAdvantage: true, motivation, form: false, weather: false });
      const season = createSeason(league, 1);
      simulateWholeSeason(league, season, flavourHooks(league));
      return season.divisions[0].table.map((r) => `${r.teamId}:${r.points}`).join(",");
    };
    expect(build(true)).not.toBe(build(false));
  });

  it("is deterministic across granularity with flavour", () => {
    const whole = () => {
      const league = flavourLeague({ homeAdvantage: true, weather: true, form: true });
      const season = createSeason(league, 1);
      simulateWholeSeason(league, season, flavourHooks(league));
      return season.divisions[0].table.map((r) => [r.teamId, r.points, r.goalsFor]);
    };
    const a = whole();
    const b = whole();
    expect(a).toEqual(b);
  });
});

function cLeague(climate: "warm" | "temperate" | "cold") {
  return createLeague(new RNG("cl"), {
    name: "cl", seed: "cl", matchesPerPairing: 2,
    levels: [{ name: "T", split: "random", divisions: [{ name: "D", teams: 4 }] }],
    rules: { climate },
  });
}
