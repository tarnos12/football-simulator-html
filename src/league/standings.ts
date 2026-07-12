/**
 * league/standings.ts — build and order a division table (§7, §21).
 *
 * Points come from the rule set; ordering applies the configured tie-break chain
 * (default: goal difference → goals scored → head-to-head → coin toss). The coin
 * toss is a deterministic hash of the team ids so a season replays identically.
 */

import type { LeagueRules } from "../config";
import type { MatchResult, ScheduledMatch, TableRow } from "../model/types";

export function emptyRow(teamId: string, startingPoints = 0): TableRow {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: startingPoints,
    startingPoints,
    positionHistory: [],
  };
}

export type Venue = "all" | "home" | "away";

/** Accumulate a table from played matches, optionally filtered to home/away games. */
export function computeTable(
  teamIds: readonly string[],
  schedule: readonly ScheduledMatch[],
  rules: LeagueRules,
  startingPoints: Record<string, number> = {},
  venue: Venue = "all",
): TableRow[] {
  const rows = new Map<string, TableRow>();
  for (const id of teamIds) rows.set(id, emptyRow(id, startingPoints[id] ?? 0));

  for (const m of schedule) {
    if (!m.result) continue;
    const r = m.result;
    const home = rows.get(m.homeId);
    const away = rows.get(m.awayId);
    if (!home || !away) continue;

    if (venue !== "away") applyResult(home, r.homeGoals, r.awayGoals, rules);
    if (venue !== "home") applyResult(away, r.awayGoals, r.homeGoals, rules);
  }
  return [...rows.values()];
}

function applyResult(row: TableRow, gf: number, ga: number, rules: LeagueRules): void {
  row.played++;
  row.goalsFor += gf;
  row.goalsAgainst += ga;
  if (gf > ga) {
    row.won++;
    row.points += rules.pointsWin;
  } else if (gf === ga) {
    row.drawn++;
    row.points += rules.pointsDraw;
  } else {
    row.lost++;
    row.points += rules.pointsLoss;
  }
}

export const goalDiff = (r: TableRow): number => r.goalsFor - r.goalsAgainst;

/** Order rows into final table positions using the configured tie-break chain. */
export function orderTable(
  rows: TableRow[],
  schedule: readonly ScheduledMatch[],
  rules: LeagueRules,
): TableRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => compareRows(a, b, schedule, rules));
  return sorted;
}

function compareRows(
  a: TableRow,
  b: TableRow,
  schedule: readonly ScheduledMatch[],
  rules: LeagueRules,
): number {
  if (b.points !== a.points) return b.points - a.points;
  for (const tb of rules.tieBreakOrder) {
    let cmp = 0;
    switch (tb) {
      case "goalDiff":
        cmp = goalDiff(b) - goalDiff(a);
        break;
      case "goalsScored":
        cmp = b.goalsFor - a.goalsFor;
        break;
      case "headToHead":
        cmp = headToHead(a.teamId, b.teamId, schedule, rules);
        break;
      case "coinToss":
        cmp = coinToss(a.teamId, b.teamId);
        break;
    }
    if (cmp !== 0) return cmp;
  }
  return coinToss(a.teamId, b.teamId);
}

/** Positive if b ranks above a on their mutual results. */
function headToHead(
  aId: string,
  bId: string,
  schedule: readonly ScheduledMatch[],
  rules: LeagueRules,
): number {
  let aPts = 0;
  let bPts = 0;
  let aGf = 0;
  let bGf = 0;
  for (const m of schedule) {
    if (!m.result) continue;
    const invA = m.homeId === aId && m.awayId === bId;
    const invB = m.homeId === bId && m.awayId === aId;
    if (!invA && !invB) continue;
    const r = m.result as MatchResult;
    const aGoals = m.homeId === aId ? r.homeGoals : r.awayGoals;
    const bGoals = m.homeId === bId ? r.homeGoals : r.awayGoals;
    aGf += aGoals;
    bGf += bGoals;
    if (aGoals > bGoals) aPts += rules.pointsWin;
    else if (aGoals === bGoals) (aPts += rules.pointsDraw), (bPts += rules.pointsDraw);
    else bPts += rules.pointsWin;
  }
  if (bPts !== aPts) return bPts - aPts;
  return bGf - aGf;
}

/** Deterministic, stable pseudo-coin-toss from the two ids. */
function coinToss(aId: string, bId: string): number {
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
    return x >>> 0;
  };
  const ha = h(aId + "|" + bId);
  const hb = h(bId + "|" + aId);
  return ha === hb ? aId.localeCompare(bId) : ha - hb;
}
