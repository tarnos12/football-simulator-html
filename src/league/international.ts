/**
 * league/international.ts — international leagues/cups (§19). Pure, deterministic.
 *
 * Teams from different league systems meet on neutral ground. Each league has a
 * strength 1–9 that is added to its teams' Att & Def (not stamina) — so a team
 * from a stronger league is favoured even with lower base stats. All normal §9
 * bonuses then apply. Runs as a strength-weighted knockout.
 */

import { RNG } from "../core/rng";
import type { MatchResult, Team } from "../model/types";
import { defaultRules } from "../config";
import { resolveMatch, type MatchContext } from "../sim/match";
import { resolveDecider } from "../sim/decider";

export interface IntlEntrant {
  /** Globally-unique id (namespaced across leagues). */
  id: string;
  team: Team;
  leagueName: string;
  strength: number; // 1–9
}

export interface IntlTie {
  aId: string;
  bId: string;
  result?: MatchResult;
  winnerId?: string;
}
export interface IntlRound {
  name: string;
  ties: IntlTie[];
}
export interface IntlState {
  name: string;
  entrants: Record<string, IntlEntrant>;
  rounds: IntlRound[];
  championId?: string;
  complete: boolean;
}

function roundName(remaining: number): string {
  if (remaining === 2) return "Final";
  if (remaining === 4) return "Semi-final";
  if (remaining === 8) return "Quarter-final";
  if (remaining === 16) return "Round of 16";
  return `Round of ${remaining}`;
}

export function createInternational(name: string, entrants: IntlEntrant[], seed: string): IntlState {
  const rng = new RNG(`${seed}::intl::${name}::draw`);
  const drawn = rng.shuffle(entrants.map((e) => e.id));
  const ties: IntlTie[] = [];
  for (let i = 0; i + 1 < drawn.length; i += 2) ties.push({ aId: drawn[i], bId: drawn[i + 1] });
  return {
    name,
    entrants: Object.fromEntries(entrants.map((e) => [e.id, e])),
    rounds: [{ name: roundName(drawn.length), ties }],
    complete: false,
  };
}

/** Play the latest round of an international competition, then draw the next. */
export function playIntlRound(state: IntlState, seed: string): void {
  if (state.complete) return;
  const round = state.rounds[state.rounds.length - 1];
  if (!round) return;

  for (const tie of round.ties) {
    if (tie.winnerId) continue;
    const a = state.entrants[tie.aId];
    const b = state.entrants[tie.bId];
    // International games are on neutral ground; league strength adds to Att/Def.
    const ctx: MatchContext = {
      rules: { ...defaultRules() },
      weather: "sunny",
      neutralGround: true,
      homeStrengthBonus: a.strength,
      awayStrengthBonus: b.strength,
    };
    const s = `${seed}::intl::${state.name}::${round.name}::${a.id}-${b.id}`;
    const result = resolveMatch(a.team, b.team, ctx, new RNG(s));
    if (result.homeGoals !== result.awayGoals) {
      tie.winnerId = result.homeGoals > result.awayGoals ? a.id : b.id;
    } else {
      const dec = resolveDecider(a.team, b.team, ctx, new RNG(s + "::dec"), result.homeGoals, result.awayGoals);
      tie.winnerId = dec.winnerId;
      result.decidedBy = dec.decidedBy;
      result.penaltyScore = dec.penaltyScore;
    }
    tie.result = result;
  }

  const winners = round.ties.map((t) => t.winnerId!).filter(Boolean);
  if (winners.length <= 1) {
    state.championId = winners[0];
    state.complete = true;
    return;
  }
  const rng = new RNG(`${seed}::intl::${state.name}::draw::${state.rounds.length}`);
  const drawn = rng.shuffle([...winners]);
  const ties: IntlTie[] = [];
  for (let i = 0; i + 1 < drawn.length; i += 2) ties.push({ aId: drawn[i], bId: drawn[i + 1] });
  state.rounds.push({ name: roundName(drawn.length), ties });
}

export function playWholeInternational(name: string, entrants: IntlEntrant[], seed: string): IntlState {
  const state = createInternational(name, entrants, seed);
  let guard = 0;
  while (!state.complete && guard++ < 20) playIntlRound(state, seed);
  return state;
}
