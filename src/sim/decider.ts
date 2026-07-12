/**
 * sim/decider.ts — overtime, penalties, and single-decider resolution (§15).
 *
 * Overtime re-rolls a result using the same modifiers as the second half.
 * Penalties are a flat 50/50, shifted by coach penalty traits (Ice cold 70% /
 * Cursed 30%), producing a plausible shootout score. All deterministic from RNG.
 */

import { RNG } from "../core/rng";
import { COACH } from "../config";
import type { CoachAttributeId } from "../config";
import type { Coach, Team } from "../model/types";
import { resolveMatch, type MatchContext } from "./match";

/** Play one overtime period: a fresh "second half" (no first-half stamina halving). */
export function resolveOvertime(
  home: Team,
  away: Team,
  ctx: MatchContext,
  rng: RNG,
): { homeGoals: number; awayGoals: number } {
  // Reuse the full resolver but read only its second half — overtime uses the
  // second-half modifiers (full stamina). Its first half is discarded.
  const r = resolveMatch(home, away, ctx, rng);
  return { homeGoals: r.halves[1].homeGoals, awayGoals: r.halves[1].awayGoals };
}

/** Probability the home team wins the shootout, given both coaches' traits. */
export function penaltyHomeWinProbability(homeCoach: Coach, awayCoach: Coach): number {
  const has = (c: Coach, id: CoachAttributeId) => c.attributes.includes(id);
  let p: number = COACH.penaltyWinBase;
  if (has(homeCoach, "penaltyUp")) p = COACH.penaltyTraitWin;
  else if (has(homeCoach, "penaltyDown")) p = COACH.penaltyTraitLose;
  // The away team's trait pulls the home probability the other way.
  if (has(awayCoach, "penaltyUp")) p = 1 - COACH.penaltyTraitWin;
  else if (has(awayCoach, "penaltyDown")) p = 1 - COACH.penaltyTraitLose;
  return p;
}

/** Simulate a plausible shootout score consistent with the decided winner. */
export function simulateShootout(
  rng: RNG,
  homeWins: boolean,
): { home: number; away: number } {
  const convert = 0.75;
  let h = 0;
  let a = 0;
  for (let i = 0; i < 5; i++) {
    if (rng.chance(convert)) h++;
    if (rng.chance(convert)) a++;
  }
  // Sudden death until someone is strictly ahead after equal kicks.
  let guard = 0;
  while (h === a && guard++ < 100) {
    const hs = rng.chance(convert);
    const as = rng.chance(convert);
    if (hs) h++;
    if (as) a++;
  }
  if (h === a) h++; // guard fallback — never leave a tie
  const homeHigher = h > a;
  if (homeHigher !== homeWins) [h, a] = [a, h];
  return { home: h, away: a };
}

export interface DeciderOutcome {
  winnerId: string;
  decidedBy: "overtime" | "penalties";
  overtime: { homeGoals: number; awayGoals: number };
  penaltyScore?: { home: number; away: number };
}

/**
 * Resolve a game that cannot end level (final, decider, level aggregate): play
 * overtime; if still tied on the running aggregate, go to penalties.
 */
export function resolveDecider(
  home: Team,
  away: Team,
  ctx: MatchContext,
  rng: RNG,
  aggregateHome = 0,
  aggregateAway = 0,
): DeciderOutcome {
  const ot = resolveOvertime(home, away, ctx, rng);
  const totalHome = aggregateHome + ot.homeGoals;
  const totalAway = aggregateAway + ot.awayGoals;

  if (totalHome !== totalAway) {
    return {
      winnerId: totalHome > totalAway ? home.id : away.id,
      decidedBy: "overtime",
      overtime: ot,
    };
  }

  const p = penaltyHomeWinProbability(home.coach, away.coach);
  const homeWins = rng.chance(p);
  const penaltyScore = simulateShootout(rng, homeWins);
  return {
    winnerId: homeWins ? home.id : away.id,
    decidedBy: "penalties",
    overtime: ot,
    penaltyScore,
  };
}
