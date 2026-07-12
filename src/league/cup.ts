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
import { goalTableOf } from "../model/config-resolve";

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
  /** Teams auto-passing the first knockout round; injected before round 2 (§14). */
  pendingByes: string[];
  /** Which group each team came from, to keep group-mates apart until the final. */
  groupOf: Record<string, string>;
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
  const state: CupState = {
    name: cfg.name, format: cfg.format, groups: [], rounds: [], complete: false,
    pendingByes: [], groupOf: {},
  };

  if (cfg.format === "groupThenKnockout") {
    const seeds = cfg.seedTeamIds ?? [];
    const rest = rng.shuffle(cfg.teamIds.filter((id) => !seeds.includes(id)));
    const seedPool = rng.shuffle([...seeds]);
    const groupCount = Math.max(1, Math.floor(cfg.teamIds.length / cfg.groupSize));
    const buckets: string[][] = Array.from({ length: groupCount }, () => []);
    // Seeded teams go one per group first; the rest fill round-robin.
    seedPool.forEach((id, i) => buckets[i % groupCount].push(id));
    rest.forEach((id, i) => buckets[i % groupCount].push(id));
    buckets.forEach((teamIds, g) => {
      const name = `Group ${String.fromCharCode(65 + g)}`;
      for (const id of teamIds) state.groupOf[id] = name;
      state.groups.push({ name, teamIds, schedule: generateSchedule(teamIds, 1, false), advance: [] });
    });
  } else {
    // Knockout: teams with a bye skip round 1 and enter round 2.
    const byes = new Set(cfg.byeTeamIds ?? []);
    const active = cfg.teamIds.filter((id) => !byes.has(id));
    state.pendingByes = cfg.teamIds.filter((id) => byes.has(id));
    state.rounds.push(firstKnockoutRound(rng, active.length ? active : cfg.teamIds));
    if (active.length === 0) state.pendingByes = [];
  }
  return state;
}

function firstKnockoutRound(rng: RNG, teamIds: readonly string[]): CupRound {
  const drawn = rng.shuffle([...teamIds]);
  const ties: CupTie[] = [];
  for (let i = 0; i + 1 < drawn.length; i += 2) ties.push({ homeId: drawn[i], awayId: drawn[i + 1] });
  return { name: roundName(drawn.length), ties };
}

/** Draw a knockout round, avoiding same-group pairings until the final (§14). */
function drawKnockout(rng: RNG, teamIds: readonly string[], groupOf: Record<string, string>): CupRound {
  const remaining = rng.shuffle([...teamIds]);
  const ties: CupTie[] = [];
  const isFinal = remaining.length === 2;
  while (remaining.length >= 2) {
    const home = remaining.shift()!;
    // Prefer an opponent from a different group (unless this is the final).
    let idx = 0;
    if (!isFinal && groupOf[home]) {
      const alt = remaining.findIndex((id) => groupOf[id] !== groupOf[home]);
      if (alt >= 0) idx = alt;
    }
    const away = remaining.splice(idx, 1)[0];
    ties.push({ homeId: home, awayId: away });
  }
  return { name: roundName(teamIds.length), ties };
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
      const ctx: MatchContext = { rules, weather: "sunny", goalTable: goalTableOf(league) };
      const rng = new RNG(`${league.seed}::cup::s${season}::${group.name}::${m.homeId}-${m.awayId}`);
      m.result = resolveMatch(league.teams[m.homeId], league.teams[m.awayId], ctx, rng);
    }
    const table = orderTable(computeTable(group.teamIds, group.schedule, rules), group.schedule, rules);
    group.advance = table.slice(0, cfg.advancePerGroup).map((r) => r.teamId);
  }
  // Seed the knockout stage from the advancers, keeping group-mates apart.
  const advancers = state.groups.flatMap((g) => g.advance);
  const rng = new RNG(`${league.seed}::cup::s${season}::ko-draw`);
  state.rounds.push(drawKnockout(rng, advancers, state.groupOf));
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
    const ctx: MatchContext = { rules, weather: "sunny", neutralGround: neutral, goalTable: goalTableOf(league) };
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

  let advancing = round.ties.map((t) => t.winnerId!).filter(Boolean);
  // Inject the auto-pass byes before the second knockout round (§14).
  if (state.pendingByes.length) {
    advancing = [...advancing, ...state.pendingByes];
    state.pendingByes = [];
  }
  if (advancing.length === 1) {
    state.championId = advancing[0];
    state.complete = true;
    return;
  }
  const rng = new RNG(`${league.seed}::cup::s${season}::draw::${state.rounds.length}`);
  state.rounds.push(drawKnockout(rng, advancing, state.groupOf));
}

/** Play the whole cup to completion. */
export function playWholeCup(league: LeagueSystem, cfg: CupConfig, season: number): CupState {
  const state = createCup(league, cfg, season);
  let guard = 0;
  while (!state.complete && guard++ < 100) playNextCupRound(league, state, cfg, season);
  return state;
}
