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

export interface DivisionArchive {
  divisionId: string;
  name: string;
  levelIndex: number;
  finalTable: TableRow[];
  results: MatchResult[];
  championId?: string;
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

  const divisions: DivisionArchive[] = season.divisions.map((ds) => ({
    divisionId: ds.divisionId,
    name: ds.name,
    levelIndex: levelIndexOf.get(ds.divisionId) ?? 0,
    finalTable: ds.table.map((r) => ({ ...r, positionHistory: [...r.positionHistory] })),
    results: ds.schedule.filter((m) => m.result).map((m) => m.result as MatchResult),
    championId: summary.divisions.find((d) => d.divisionId === ds.divisionId)?.championId,
  }));

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
