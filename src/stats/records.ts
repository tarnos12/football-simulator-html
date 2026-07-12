/**
 * stats/records.ts — statistics & history (§20). Pure TypeScript.
 *
 * A completed season is archived (final tables + results). Records are derived
 * from the accumulated archives: all-time table, championships, biggest wins,
 * streaks, head-to-head, and season extremes.
 */

import type { LeagueSystem, MatchResult, TableRow } from "../model/types";
import type { SeasonState } from "../league/types";
import { seasonSummary } from "../league/summary";
import { combinedFinalTable, allResultsForSource } from "../league/phases";

export interface DivisionArchive {
  divisionId: string;
  name: string;
  levelIndex: number;
  finalTable: TableRow[];
  results: MatchResult[];
  championId?: string;
  relegated: string[];
}
export interface SeasonArchive {
  seasonNumber: number;
  divisions: DivisionArchive[];
  overallChampionId?: string;
}

/** Snapshot a completed season for the history store. */
export function archiveSeason(league: LeagueSystem, season: SeasonState): SeasonArchive {
  const summary = seasonSummary(league, season);
  const levelIndexOf = new Map<string, number>();
  league.levels.forEach((l, i) => l.divisions.forEach((d) => levelIndexOf.set(d.id, i)));

  // Archive once per source (model) division, using its combined final standings
  // and results across every phase — so split leagues aren't double-counted.
  const sourceIds = [...new Set(season.divisions.map((d) => d.sourceDivisionId))];
  const divisions: DivisionArchive[] = sourceIds.map((sourceId) => {
    const ds = season.divisions.find((d) => d.sourceDivisionId === sourceId)!;
    const divSummary = summary.divisions.find((d) => d.divisionId === sourceId);
    const combined = combinedFinalTable(season, sourceId);
    return {
      divisionId: sourceId,
      name: ds.name,
      levelIndex: levelIndexOf.get(sourceId) ?? 0,
      finalTable: combined.map((r) => ({ ...r, positionHistory: [...r.positionHistory] })),
      results: allResultsForSource(season, sourceId),
      championId: divSummary?.championId,
      relegated: divSummary?.relegated ?? [],
    };
  });

  return { seasonNumber: season.seasonNumber, divisions, overallChampionId: summary.overallChampionId };
}

export interface AllTimeRow {
  teamId: string;
  seasons: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  titles: number;
}

/** All-time aggregate table across every archived season (all divisions). */
export function allTimeTable(archives: readonly SeasonArchive[]): AllTimeRow[] {
  const rows = new Map<string, AllTimeRow>();
  const get = (id: string) =>
    rows.get(id) ??
    rows.set(id, { teamId: id, seasons: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, titles: 0 }).get(id)!;

  for (const arch of archives) {
    for (const div of arch.divisions) {
      for (const r of div.finalTable) {
        const row = get(r.teamId);
        row.seasons++;
        row.played += r.played;
        row.won += r.won;
        row.drawn += r.drawn;
        row.lost += r.lost;
        row.goalsFor += r.goalsFor;
        row.goalsAgainst += r.goalsAgainst;
        row.points += r.points;
      }
      if (div.championId) get(div.championId).titles++;
    }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.won - a.won);
}

export interface BigResult {
  match: MatchResult;
  margin: number;
  totalGoals: number;
  seasonNumber: number;
}

/** Biggest winning margin and highest-scoring match across all archives. */
export function extremeResults(archives: readonly SeasonArchive[]): {
  biggestWin?: BigResult;
  mostGoals?: BigResult;
} {
  let biggestWin: BigResult | undefined;
  let mostGoals: BigResult | undefined;
  for (const arch of archives) {
    for (const div of arch.divisions) {
      for (const m of div.results) {
        const margin = Math.abs(m.homeGoals - m.awayGoals);
        const total = m.homeGoals + m.awayGoals;
        if (!biggestWin || margin > biggestWin.margin) biggestWin = { match: m, margin, totalGoals: total, seasonNumber: arch.seasonNumber };
        if (!mostGoals || total > mostGoals.totalGoals) mostGoals = { match: m, margin, totalGoals: total, seasonNumber: arch.seasonNumber };
      }
    }
  }
  return { biggestWin, mostGoals };
}

export interface ChampionCount {
  teamId: string;
  titles: number;
}
export function mostChampionships(archives: readonly SeasonArchive[]): ChampionCount[] {
  const counts = new Map<string, number>();
  for (const arch of archives) {
    for (const div of arch.divisions) {
      if (div.levelIndex === 0 && div.championId) {
        counts.set(div.championId, (counts.get(div.championId) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()].map(([teamId, titles]) => ({ teamId, titles })).sort((a, b) => b.titles - a.titles);
}

export interface StreakRecord {
  teamId: string;
  length: number;
  seasonNumber: number;
  kind: "win" | "unbeaten" | "loss" | "winless";
}

/** Longest streaks of each kind, scanning each team's chronological results. */
export function longestStreaks(archives: readonly SeasonArchive[]): Record<StreakRecord["kind"], StreakRecord | undefined> {
  const best: Record<StreakRecord["kind"], StreakRecord | undefined> = {
    win: undefined, unbeaten: undefined, loss: undefined, winless: undefined,
  };
  for (const arch of archives) {
    for (const div of arch.divisions) {
      // Reconstruct each team's sequence of outcomes in schedule order.
      const seq = new Map<string, ("W" | "D" | "L")[]>();
      for (const m of div.results) {
        pushOutcome(seq, m.homeId, m.homeGoals, m.awayGoals);
        pushOutcome(seq, m.awayId, m.awayGoals, m.homeGoals);
      }
      for (const [teamId, outcomes] of seq) {
        consider(best, "win", teamId, arch.seasonNumber, run(outcomes, (o) => o === "W"));
        consider(best, "unbeaten", teamId, arch.seasonNumber, run(outcomes, (o) => o !== "L"));
        consider(best, "loss", teamId, arch.seasonNumber, run(outcomes, (o) => o === "L"));
        consider(best, "winless", teamId, arch.seasonNumber, run(outcomes, (o) => o !== "W"));
      }
    }
  }
  return best;
}

export interface LeagueRecord {
  label: string;
  value: string;
  teamId?: string;
  seasonNumber?: number;
}

/** The §20 record set derived from all archives (top-division focus for titles). */
export function leagueRecords(archives: readonly SeasonArchive[]): LeagueRecord[] {
  const recs: LeagueRecord[] = [];
  if (archives.length === 0) return recs;
  const topDivs = archives.flatMap((a) => a.divisions.filter((d) => d.levelIndex === 0).map((d) => ({ a, d })));
  const allDivs = archives.flatMap((a) => a.divisions.map((d) => ({ a, d })));

  // Champion points extremes + averages (top division).
  const champs = topDivs
    .map(({ a, d }) => ({ a, d, row: d.finalTable[0] }))
    .filter((x) => x.row);
  if (champs.length) {
    const byPts = [...champs].sort((x, y) => y.row.points - x.row.points);
    push(recs, "Highest winning points", `${byPts[0].row.points}`, byPts[0].row.teamId, byPts[0].a.seasonNumber);
    const low = byPts[byPts.length - 1];
    push(recs, "Lowest winning points", `${low.row.points}`, low.row.teamId, low.a.seasonNumber);
    push(recs, "Avg points to be champion", avg(champs.map((c) => c.row.points)).toFixed(1));

    // Winning margin = champion − runner-up.
    const margins = champs
      .filter((c) => c.d.finalTable[1])
      .map((c) => ({ c, m: c.row.points - c.d.finalTable[1].points }));
    if (margins.length) {
      const bySize = [...margins].sort((x, y) => y.m - x.m);
      push(recs, "Biggest title margin", `${bySize[0].m} pts`, bySize[0].c.row.teamId, bySize[0].c.a.seasonNumber);
      const small = bySize[bySize.length - 1];
      push(recs, "Smallest title margin", `${small.m} pts`, small.c.row.teamId, small.c.a.seasonNumber);
    }
  }

  // Points to avoid relegation (lowest safe team, top division).
  const safePts = topDivs
    .map(({ a, d }) => {
      const idx = d.finalTable.length - d.relegated.length - 1;
      return idx >= 0 ? { a, row: d.finalTable[idx] } : null;
    })
    .filter((x): x is { a: SeasonArchive; row: TableRow } => !!x);
  if (safePts.length) push(recs, "Avg points to stay up", avg(safePts.map((s) => s.row.points)).toFixed(1));

  // Highest points that still got relegated (across all divisions).
  const relRows = allDivs.flatMap(({ a, d }) => d.relegated.map((id) => ({ a, row: d.finalTable.find((r) => r.teamId === id)! })).filter((x) => x.row));
  if (relRows.length) {
    const top = [...relRows].sort((x, y) => y.row.points - x.row.points)[0];
    push(recs, "Most points, still relegated", `${top.row.points}`, top.row.teamId, top.a.seasonNumber);
  }

  // Goals & GD extremes (all divisions).
  const rows = allDivs.flatMap(({ a, d }) => d.finalTable.map((row) => ({ a, row })));
  extremum(recs, rows, "Most goals in a season", (r) => r.row.goalsFor, true);
  extremum(recs, rows, "Fewest goals in a season", (r) => r.row.goalsFor, false);
  extremum(recs, rows, "Best goal difference", (r) => r.row.goalsFor - r.row.goalsAgainst, true, true);
  extremum(recs, rows, "Worst goal difference", (r) => r.row.goalsFor - r.row.goalsAgainst, false, true);
  extremum(recs, rows, "Fewest points in a season", (r) => r.row.points, false);

  // Highest-scoring draw (all matches).
  let hiDraw: { total: number; s: string; season: number } | null = null;
  for (const { a, d } of allDivs) {
    for (const m of d.results) {
      if (m.homeGoals === m.awayGoals) {
        const total = m.homeGoals + m.awayGoals;
        if (!hiDraw || total > hiDraw.total) hiDraw = { total, s: `${m.homeGoals}–${m.awayGoals}`, season: a.seasonNumber };
      }
    }
  }
  if (hiDraw) push(recs, "Highest-scoring draw", hiDraw.s, undefined, hiDraw.season);

  return recs;
}

function extremum(
  recs: LeagueRecord[],
  rows: { a: SeasonArchive; row: TableRow }[],
  label: string,
  metric: (r: { a: SeasonArchive; row: TableRow }) => number,
  max: boolean,
  signed = false,
): void {
  if (!rows.length) return;
  const sorted = [...rows].sort((x, y) => (max ? metric(y) - metric(x) : metric(x) - metric(y)));
  const best = sorted[0];
  const v = metric(best);
  push(recs, label, signed && v > 0 ? `+${v}` : `${v}`, best.row.teamId, best.a.seasonNumber);
}

function push(recs: LeagueRecord[], label: string, value: string, teamId?: string, seasonNumber?: number): void {
  recs.push({ label, value, teamId, seasonNumber });
}
function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Head-to-head across all archives between two teams. */
export function headToHead(archives: readonly SeasonArchive[], aId: string, bId: string) {
  let aWins = 0, bWins = 0, draws = 0, aGoals = 0, bGoals = 0;
  for (const arch of archives) {
    for (const div of arch.divisions) {
      for (const m of div.results) {
        const involves = (m.homeId === aId && m.awayId === bId) || (m.homeId === bId && m.awayId === aId);
        if (!involves) continue;
        const ag = m.homeId === aId ? m.homeGoals : m.awayGoals;
        const bg = m.homeId === bId ? m.homeGoals : m.awayGoals;
        aGoals += ag; bGoals += bg;
        if (ag > bg) aWins++; else if (bg > ag) bWins++; else draws++;
      }
    }
  }
  return { aWins, bWins, draws, aGoals, bGoals, games: aWins + bWins + draws };
}

// ── helpers ──
function pushOutcome(seq: Map<string, ("W" | "D" | "L")[]>, id: string, gf: number, ga: number) {
  const arr = seq.get(id) ?? seq.set(id, []).get(id)!;
  arr.push(gf > ga ? "W" : gf === ga ? "D" : "L");
}
function run(outcomes: ("W" | "D" | "L")[], pred: (o: "W" | "D" | "L") => boolean): number {
  let best = 0, cur = 0;
  for (const o of outcomes) {
    if (pred(o)) best = Math.max(best, ++cur);
    else cur = 0;
  }
  return best;
}
function consider(
  best: Record<StreakRecord["kind"], StreakRecord | undefined>,
  kind: StreakRecord["kind"],
  teamId: string,
  seasonNumber: number,
  length: number,
) {
  if (length <= 0) return;
  const cur = best[kind];
  if (!cur || length > cur.length) best[kind] = { teamId, length, seasonNumber, kind };
}
