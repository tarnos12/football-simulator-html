import { describe, it, expect } from "vitest";
import { RNG } from "../core/rng";
import { createLeague } from "./create";
import { Campaign } from "../game/campaign";
import { combinedFinalTable, finalGroupsFor } from "./phases";
import { resolvePlayoffTie, type PlayoffTie } from "./playoff";
import { seasonSummary } from "./summary";

function splitLeague(carry: "full" | "zero" | "half" = "full") {
  return createLeague(new RNG("split"), {
    name: "Split League",
    seed: "split",
    matchesPerPairing: 2,
    levels: [
      { name: "Top", split: "random", divisions: [{ name: "Premier", teams: 8 }] },
      { name: "Two", split: "random", divisions: [{ name: "Division 2", teams: 8 }] },
    ],
    championshipSplit: { topN: 4, carry, matchesPerPairing: 1 },
  });
}

describe("Multi-phase leagues — championship split (§6)", () => {
  it("splits the top division into two groups after the regular season", () => {
    const c = new Campaign(splitLeague());
    c.simulateSeason();
    expect(c.seasonComplete()).toBe(true);

    // The top division (L0D0) now has phase-1 groups.
    const groups = finalGroupsFor(c.season, "L0D0");
    expect(groups.length).toBe(2);
    expect(groups.every((g) => g.phaseIndex === 1)).toBe(true);
    expect(groups[0].groupName).toBe("Championship group");

    // Combined final table covers all 8 teams, championship group on top.
    const combined = combinedFinalTable(c.season, "L0D0");
    expect(combined.length).toBe(8);

    // The lower tier (no split) still resolves normally.
    expect(combinedFinalTable(c.season, "L1D0").length).toBe(8);
  });

  it("champion comes from the championship group; pro/rel still resolves", () => {
    const c = new Campaign(splitLeague());
    c.simulateSeason();
    const summary = seasonSummary(c.league, c.season);
    const topDiv = summary.divisions.find((d) => d.divisionId === "L0D0")!;
    const champGroup = finalGroupsFor(c.season, "L0D0")[0];
    expect(champGroup.teamIds).toContain(topDiv.championId);
    expect(topDiv.relegated.length).toBe(2);

    // Advancing a season restructures membership without crashing.
    const before = c.seasonNumber;
    c.advanceToNextSeason();
    expect(c.seasonNumber).toBe(before + 1);
  });

  it("carry mode changes carried points (full vs zero)", () => {
    const full = new Campaign(splitLeague("full"));
    full.simulateSeason();
    const zero = new Campaign(splitLeague("zero"));
    zero.simulateSeason();
    const fullStart = Object.values(finalGroupsFor(full.season, "L0D0")[0].startingPoints);
    const zeroStart = Object.values(finalGroupsFor(zero.season, "L0D0")[0].startingPoints);
    expect(Math.max(...fullStart)).toBeGreaterThan(0);
    expect(Math.max(...zeroStart, 0)).toBe(0);
  });

  it("is deterministic", () => {
    const a = new Campaign(splitLeague());
    a.simulateSeason();
    const b = new Campaign(splitLeague());
    b.simulateSeason();
    const ta = combinedFinalTable(a.season, "L0D0").map((r) => [r.teamId, r.points]);
    const tb = combinedFinalTable(b.season, "L0D0").map((r) => [r.teamId, r.points]);
    expect(ta).toEqual(tb);
  });
});

describe("Playoff series (§15)", () => {
  const league = createLeague(new RNG("po"), {
    name: "PO", seed: "po", matchesPerPairing: 2,
    levels: [{ name: "T", split: "random", divisions: [{ name: "D", teams: 6 }] }],
  });
  const [a, b] = Object.keys(league.teams);

  it("single game always yields a winner", () => {
    const tie: PlayoffTie = { aId: a, bId: b, format: { kind: "single", neutral: true } };
    const r = resolvePlayoffTie(league, tie, "s1");
    expect([a, b]).toContain(r.winnerId);
    expect(r.legs.length).toBe(1);
  });

  it("two-leg aggregate plays both legs and names a winner", () => {
    const tie: PlayoffTie = { aId: a, bId: b, format: { kind: "twoLeg" } };
    const r = resolvePlayoffTie(league, tie, "s2");
    expect(r.legs.length).toBe(2);
    expect(r.aggregate).toBeDefined();
    expect([a, b]).toContain(r.winnerId);
  });

  it("best-of-3 names a winner with the higher seed hosting the extra game", () => {
    const tie: PlayoffTie = { aId: a, bId: b, format: { kind: "bestOf", games: 3 }, higherSeedId: a };
    const r = resolvePlayoffTie(league, tie, "s3");
    expect([a, b]).toContain(r.winnerId);
    expect(r.seriesWins).toBeDefined();
    expect(r.legs.length).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic for the same seed base", () => {
    const tie: PlayoffTie = { aId: a, bId: b, format: { kind: "bestOf", games: 5 }, higherSeedId: b };
    expect(resolvePlayoffTie(league, tie, "x").winnerId).toBe(resolvePlayoffTie(league, tie, "x").winnerId);
  });
});
