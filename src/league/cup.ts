/**
 * league/cup.ts — cups & knockouts (§14). Pure and deterministic.
 *
 * Supports a pure single-elimination knockout (random draw each round, neutral
 * final, deciders for ties) and a group-stage-then-knockout format. Ties in
 * knockout games go to overtime/penalties (§15) since a draw can't stand.
 */

import { RNG } from "../core/rng";
import type { CupConfig, LeagueSystem, MatchResult } from "../model/types";
import { resolveMatch, type MatchContext } from "../sim/match";
import { resolveDecider } from "../sim/decider";
import { computeTable, orderTable } from "./standings";
import { generateSchedule } from "./schedule";
import type { ScheduledMatch } from "../model/types";

export interface CupTie {
  homeId: string;
  awayId: string;
  result?: MatchResult;
  winnerId?: string;
}
export interface CupRound {
  name: string;
  ties: CupTie[];
}
export interface CupGroup {
  name: string;
  teamIds: string[];
  schedule: ScheduledMatch[];
  advance: string[];
}
export interface CupState {
  name: string;
  format: CupConfig["format"];
  groups: CupGroup[];
  rounds: CupRound[];
  championId?: string;
  complete: boolean;
}

function roundName(remaining: number): string {
  if (remaining === 2) return "Final";
  if (remaining === 4) return "Semi-final";
  if (remaining === 8) return "Quarter-final";
  if (remaining === 16) return "Round of 16";
  if (remaining === 32) return "Round of 32";
  return `Round of ${remaining}`;
}

/** Create the initial cup state (first knockout round, or group stage). */
export function createCup(league: LeagueSystem, cfg: CupConfig, season: number): CupState {
  const rng = new RNG(`${league.seed}::cup::s${season}::draw`);
  const state: CupState = { name: cfg.name, format: cfg.format, groups: [], rounds: [], complete: false };

  if (cfg.format === "groupThenKnockout") {
    const pool = rng.shuffle([...cfg.teamIds]);
    const groupCount = Math.max(1, Math.floor(pool.length / cfg.groupSize));
    for (let g = 0; g < groupCount; g++) {
      const teamIds = pool.slice(g * cfg.groupSize, (g + 1) * cfg.groupSize);
      state.groups.push({
        name: `Group ${String.fromCharCode(65 + g)}`,
        teamIds,
        schedule: generateSchedule(teamIds, 1, false),
        advance: [],
      });
    }
  } else {
    state.rounds.push(firstKnockoutRound(rng, cfg.teamIds));
  }
  return state;
}

function firstKnockoutRound(rng: RNG, teamIds: readonly string[]): CupRound {
  const drawn = rng.shuffle([...teamIds]);
  const ties: CupTie[] = [];
  for (let i = 0; i + 1 < drawn.length; i += 2) ties.push({ homeId: drawn[i], awayId: drawn[i + 1] });
  return { name: roundName(drawn.length), ties };
}

function cupRules(league: LeagueSystem, cfg: CupConfig) {
  return { ...league.rules, ...(cfg.rulesOverride ?? {}) };
}

/** Play every group's matches, compute standings, mark advancers. */
export function playGroupStage(league: LeagueSystem, state: CupState, cfg: CupConfig, season: number): void {
  const rules = cupRules(league, cfg);
  for (const group of state.groups) {
    for (const m of group.schedule) {
      if (m.result) continue;
      const ctx: MatchContext = { rules, weather: "sunny" };
      const rng = new RNG(`${league.seed}::cup::s${season}::${group.name}::${m.homeId}-${m.awayId}`);
      m.result = resolveMatch(league.teams[m.homeId], league.teams[m.awayId], ctx, rng);
    }
    const table = orderTable(computeTable(group.teamIds, group.schedule, rules), group.schedule, rules);
    group.advance = table.slice(0, cfg.advancePerGroup).map((r) => r.teamId);
  }
  // Seed the knockout stage from the advancers.
  const advancers = state.groups.flatMap((g) => g.advance);
  const rng = new RNG(`${league.seed}::cup::s${season}::ko-draw`);
  state.rounds.push(firstKnockoutRound(rng, advancers));
}

/** Play the current (latest) knockout round, then draw the next or crown a winner. */
export function playNextCupRound(league: LeagueSystem, state: CupState, cfg: CupConfig, season: number): void {
  if (state.complete) return;
  if (cfg.format === "groupThenKnockout" && state.rounds.length === 0) {
    playGroupStage(league, state, cfg, season);
    return;
  }
  const round = state.rounds[state.rounds.length - 1];
  if (!round) return;
  const rules = cupRules(league, cfg);
  const isFinal = round.ties.length === 1;

  for (const tie of round.ties) {
    if (tie.winnerId) continue;
    const neutral = isFinal && cfg.finalNeutralGround;
    const ctx: MatchContext = { rules, weather: "sunny", neutralGround: neutral };
    const seed = `${league.seed}::cup::s${season}::${round.name}::${tie.homeId}-${tie.awayId}`;
    const rng = new RNG(seed);
    const home = league.teams[tie.homeId];
    const away = league.teams[tie.awayId];
    const result = resolveMatch(home, away, ctx, rng);
    if (result.homeGoals !== result.awayGoals) {
      tie.winnerId = result.homeGoals > result.awayGoals ? tie.homeId : tie.awayId;
    } else {
      const dec = resolveDecider(home, away, ctx, new RNG(seed + "::dec"), result.homeGoals, result.awayGoals);
      tie.winnerId = dec.winnerId;
      result.decidedBy = dec.decidedBy;
      result.penaltyScore = dec.penaltyScore;
      result.winnerId = dec.winnerId;
    }
    tie.result = result;
  }

  const winners = round.ties.map((t) => t.winnerId!).filter(Boolean);
  if (winners.length === 1) {
    state.championId = winners[0];
    state.complete = true;
    return;
  }
  const rng = new RNG(`${league.seed}::cup::s${season}::draw::${state.rounds.length}`);
  state.rounds.push(firstKnockoutRound(rng, winners));
}

/** Play the whole cup to completion. */
export function playWholeCup(league: LeagueSystem, cfg: CupConfig, season: number): CupState {
  const state = createCup(league, cfg, season);
  let guard = 0;
  while (!state.complete && guard++ < 100) playNextCupRound(league, state, cfg, season);
  return state;
}
