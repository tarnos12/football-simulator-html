/**
 * league/season.ts — create and simulate a season (§4, §8, §21).
 *
 * Granularity: one match, one round (a division or the whole system), or a whole
 * season. Every match is seeded deterministically from (league seed, season#,
 * division, round, home, away), so results are identical regardless of the order
 * in which matches/rounds are simulated, and a season replays byte-identically.
 */

import { RNG } from "../core/rng";
import { resolveMatch, type MatchContext } from "../sim/match";
import type { LeagueRules } from "../config";
import type { Division, LeagueSystem, ScheduledMatch } from "../model/types";
import { goalTableOf } from "../model/config-resolve";
import { computeTable, orderTable } from "./standings";
import { generateSchedule, roundCount } from "./schedule";
import type { DivisionSeason, SeasonState } from "./types";

/** Hook for higher layers (systems/) to enrich each match's context (pre-match). */
export type ContextFor = (
  homeId: string,
  awayId: string,
  div: DivisionSeason,
  season: SeasonState,
  league: LeagueSystem,
) => Partial<MatchContext>;

/** Post-match hook (systems/): attendance, crowd incidents, form updates. */
export type AfterMatch = (
  result: import("../model/types").MatchResult,
  div: DivisionSeason,
  season: SeasonState,
  league: LeagueSystem,
  rng: RNG,
) => void;

export interface SimHooks {
  context?: ContextFor;
  afterMatch?: AfterMatch;
}

function divisionRules(league: LeagueSystem, div: Division): LeagueRules {
  return { ...league.rules, ...(div.rulesOverride ?? {}) };
}

function allDivisions(league: LeagueSystem): { div: Division; levelId: string }[] {
  return league.levels.flatMap((l) => l.divisions.map((div) => ({ div, levelId: l.id })));
}

/** Build a fresh season: schedule every division, empty ordered tables. */
export function createSeason(
  league: LeagueSystem,
  seasonNumber: number,
  startingPoints: Record<string, Record<string, number>> = {},
): SeasonState {
  const divisions: DivisionSeason[] = allDivisions(league).map(({ div, levelId }) => {
    const rules = divisionRules(league, div);
    const phase = div.phases[0];
    const schedule = generateSchedule(div.teamIds, phase.matchesPerPairing, rules.mirroring);
    const sp = startingPoints[div.id] ?? {};
    const ds: DivisionSeason = {
      divisionId: div.id,
      levelId,
      name: div.name,
      teamIds: [...div.teamIds],
      schedule,
      totalRounds: roundCount(schedule),
      playedRounds: 0,
      startingPoints: sp,
      table: [],
      markers: [],
      sourceDivisionId: div.id,
      phaseIndex: 0,
    };
    ds.table = orderTable(computeTable(div.teamIds, schedule, rules, sp), schedule, rules);
    return ds;
  });

  return { seasonNumber, divisions, complete: false };
}

function matchSeed(league: LeagueSystem, season: number, div: string, m: ScheduledMatch): string {
  return `${league.seed}::s${season}::${div}::r${m.round}::${m.homeId}-vs-${m.awayId}`;
}

/** Play a single scheduled match in place (idempotent — skips if already played). */
export function simulateMatch(
  league: LeagueSystem,
  season: SeasonState,
  div: DivisionSeason,
  match: ScheduledMatch,
  hooks?: SimHooks,
): void {
  if (match.result) return;
  const leagueDivision = league.levels
    .flatMap((l) => l.divisions)
    .find((d) => d.id === div.sourceDivisionId)!;
  const rules = divisionRules(league, leagueDivision);
  const home = league.teams[match.homeId];
  const away = league.teams[match.awayId];
  const base: MatchContext = { rules, weather: "sunny", goalTable: goalTableOf(league) };
  const extra = hooks?.context?.(match.homeId, match.awayId, div, season, league) ?? {};
  const ctx: MatchContext = { ...base, ...extra, rules };
  const seed = matchSeed(league, season.seasonNumber, div.divisionId, match);
  match.result = resolveMatch(home, away, ctx, new RNG(seed));
  // Post-match flavour (attendance, incidents, form) uses a separate stream so
  // adding it never perturbs the match-resolution stream.
  hooks?.afterMatch?.(match.result, div, season, league, new RNG(seed + "::post"));
}

/** Recompute and re-order a division's table (no position-history push). */
export function refreshDivisionTable(league: LeagueSystem, div: DivisionSeason): void {
  const leagueDivision = league.levels
    .flatMap((l) => l.divisions)
    .find((d) => d.id === div.sourceDivisionId)!;
  const rules = divisionRules(league, leagueDivision);
  const rows = computeTable(div.teamIds, div.schedule, rules, div.startingPoints);
  const ordered = orderTable(rows, div.schedule, rules);

  // Preserve position history across refreshes, keyed by team id.
  const priorHistory = new Map(div.table.map((r) => [r.teamId, r.positionHistory]));
  ordered.forEach((row, i) => {
    row.positionHistory = priorHistory.get(row.teamId) ?? [];
    void i;
  });
  div.table = ordered;
}

/** Simulate the next unplayed round of one division. Returns matches played. */
export function simulateDivisionRound(
  league: LeagueSystem,
  season: SeasonState,
  div: DivisionSeason,
  hooks?: SimHooks,
): ScheduledMatch[] {
  const nextRound = div.playedRounds + 1;
  if (nextRound > div.totalRounds) return [];
  const roundMatches = div.schedule.filter((m) => m.round === nextRound);
  for (const m of roundMatches) simulateMatch(league, season, div, m, hooks);
  div.playedRounds = nextRound;
  refreshDivisionTable(league, div);
  // Record each team's position after this completed round.
  div.table.forEach((row, i) => row.positionHistory.push(i + 1));
  return roundMatches;
}

/** Simulate the next round across every division in the system. */
export function simulateSystemRound(
  league: LeagueSystem,
  season: SeasonState,
  hooks?: SimHooks,
): void {
  for (const div of season.divisions) simulateDivisionRound(league, season, div, hooks);
  season.complete = season.divisions.every((d) => d.playedRounds >= d.totalRounds);
}

/** Simulate everything remaining in the season (the "whole season" click). */
export function simulateWholeSeason(
  league: LeagueSystem,
  season: SeasonState,
  hooks?: SimHooks,
): void {
  for (const div of season.divisions) {
    while (div.playedRounds < div.totalRounds) {
      simulateDivisionRound(league, season, div, hooks);
    }
  }
  season.complete = true;
}

/** Convenience: is the whole season finished? */
export function isSeasonComplete(season: SeasonState): boolean {
  return season.divisions.every((d) => d.playedRounds >= d.totalRounds);
}
