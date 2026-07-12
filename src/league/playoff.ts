/**
 * league/playoff.ts — playoff series & deciders (§15). Pure, deterministic.
 *
 * Three shapes: a single decider game (often neutral ground), a two-leg aggregate
 * (home + away, combined score), and a best-of-N series (first to a majority of
 * wins; the higher seed gets the extra home game). Draws in a series don't count
 * as wins; a tie that still can't separate the teams goes to overtime/penalties.
 */

import { RNG } from "../core/rng";
import type { LeagueSystem, MatchResult } from "../model/types";
import { resolveMatch, type MatchContext } from "../sim/match";
import { resolveDecider } from "../sim/decider";
import { goalTableOf } from "../model/config-resolve";

export type PlayoffFormat =
  | { kind: "single"; neutral?: boolean }
  | { kind: "twoLeg" }
  | { kind: "bestOf"; games: number };

export interface PlayoffTie {
  aId: string;
  bId: string;
  format: PlayoffFormat;
  /** The higher-seeded team (gets the extra home game in a best-of series). */
  higherSeedId?: string;
  label?: string;
}

export interface PlayoffResult {
  tie: PlayoffTie;
  winnerId: string;
  legs: MatchResult[];
  aggregate?: { a: number; b: number };
  seriesWins?: { a: number; b: number };
  decidedBy?: "overtime" | "penalties";
}

function ctxFor(league: LeagueSystem, neutral: boolean): MatchContext {
  return { rules: league.rules, weather: "sunny", neutralGround: neutral, goalTable: goalTableOf(league) };
}

function play(league: LeagueSystem, homeId: string, awayId: string, neutral: boolean, seed: string): MatchResult {
  return resolveMatch(league.teams[homeId], league.teams[awayId], ctxFor(league, neutral), new RNG(seed));
}

/** Resolve a playoff tie to a single winner. */
export function resolvePlayoffTie(league: LeagueSystem, tie: PlayoffTie, seedBase: string): PlayoffResult {
  const { aId, bId, format } = tie;
  const legs: MatchResult[] = [];

  if (format.kind === "single") {
    const seed = `${seedBase}::single`;
    const r = play(league, aId, bId, !!format.neutral, seed);
    legs.push(r);
    if (r.homeGoals !== r.awayGoals) {
      return { tie, winnerId: r.homeGoals > r.awayGoals ? aId : bId, legs };
    }
    const dec = resolveDecider(league.teams[aId], league.teams[bId], ctxFor(league, !!format.neutral), new RNG(seed + "::dec"), r.homeGoals, r.awayGoals);
    r.decidedBy = dec.decidedBy;
    r.penaltyScore = dec.penaltyScore;
    return { tie, winnerId: dec.winnerId, legs, decidedBy: dec.decidedBy };
  }

  if (format.kind === "twoLeg") {
    const leg1 = play(league, aId, bId, false, `${seedBase}::leg1`); // a home
    const leg2 = play(league, bId, aId, false, `${seedBase}::leg2`); // b home
    legs.push(leg1, leg2);
    const aTotal = leg1.homeGoals + leg2.awayGoals;
    const bTotal = leg1.awayGoals + leg2.homeGoals;
    if (aTotal !== bTotal) {
      return { tie, winnerId: aTotal > bTotal ? aId : bId, legs, aggregate: { a: aTotal, b: bTotal } };
    }
    // Level aggregate → overtime/penalties on the second leg.
    const dec = resolveDecider(league.teams[bId], league.teams[aId], ctxFor(league, false), new RNG(`${seedBase}::agg::dec`));
    // dec winner is in (b,a) home/away order; map back to a/b ids directly.
    return { tie, winnerId: dec.winnerId, legs, aggregate: { a: aTotal, b: bTotal }, decidedBy: dec.decidedBy };
  }

  // best-of-N: alternate home, higher seed starts at home (extra home game).
  const target = Math.floor(format.games / 2) + 1;
  const seedTeam = tie.higherSeedId === bId ? bId : aId;
  const otherTeam = seedTeam === aId ? bId : aId;
  let seedWins = 0;
  let otherWins = 0;
  let game = 0;
  const maxGames = format.games + 4; // guard for draw-heavy series
  while (seedWins < target && otherWins < target && game < maxGames) {
    const seedHome = game % 2 === 0; // seed hosts games 1,3,5…
    const home = seedHome ? seedTeam : otherTeam;
    const away = seedHome ? otherTeam : seedTeam;
    const r = play(league, home, away, false, `${seedBase}::g${game}`);
    legs.push(r);
    if (r.homeGoals > r.awayGoals) (home === seedTeam ? seedWins++ : otherWins++);
    else if (r.awayGoals > r.homeGoals) (away === seedTeam ? seedWins++ : otherWins++);
    game++;
  }
  let winnerId: string;
  let decidedBy: PlayoffResult["decidedBy"];
  if (seedWins > otherWins) winnerId = seedTeam;
  else if (otherWins > seedWins) winnerId = otherTeam;
  else {
    const dec = resolveDecider(league.teams[seedTeam], league.teams[otherTeam], ctxFor(league, false), new RNG(`${seedBase}::series::dec`));
    winnerId = dec.winnerId;
    decidedBy = dec.decidedBy;
  }
  const wins = seedTeam === aId ? { a: seedWins, b: otherWins } : { a: otherWins, b: seedWins };
  return { tie, winnerId, legs, seriesWins: wins, decidedBy };
}
