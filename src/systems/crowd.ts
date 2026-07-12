/**
 * systems/crowd.ts — violent/disruptive crowd incidents (§18). Post-match.
 *
 * Per-game incident risk is driven by Club Size × Organisation. On an incident a
 * marker always appears; there's then a chance the team is punished with a 0–3
 * loss (so it doesn't happen too often). If both teams are punished, both lose.
 */

import { RNG } from "../core/rng";
import { CROWD } from "../config";
import type { LeagueRules } from "../config";
import type { MatchResult, Team } from "../model/types";

export function incidentRisk(team: Team): number {
  return CROWD.riskBySizeOrg[team.clubSize]?.[team.organisation] ?? 0;
}

/** Apply crowd incidents to a result in place (markers + possible 0–3 forfeit). */
export function applyCrowdIncidents(
  result: MatchResult,
  home: Team,
  away: Team,
  rules: LeagueRules,
  rng: RNG,
  reasons: string[] = [...CROWD.reasons],
): void {
  if (!rules.crowdTrouble) return;

  const homeIncident = rng.chance(incidentRisk(home));
  const awayIncident = rng.chance(incidentRisk(away));
  if (!homeIncident && !awayIncident) return;

  let homePunished = false;
  let awayPunished = false;
  if (homeIncident) {
    result.incidents.push({ kind: "crowd", teamId: home.id, reason: rng.pick(reasons) });
    homePunished = rng.chance(CROWD.punishmentChance);
  }
  if (awayIncident) {
    result.incidents.push({ kind: "crowd", teamId: away.id, reason: rng.pick(reasons) });
    awayPunished = rng.chance(CROWD.punishmentChance);
  }

  const forfeit = CROWD.forfeitLossRange.max; // lose by 0–3 → 3 to the other side
  if (homePunished && awayPunished) {
    result.homeGoals = 0; result.awayGoals = 0;
    result.halftimeHome = 0; result.halftimeAway = 0;
  } else if (homePunished) {
    result.homeGoals = 0; result.awayGoals = forfeit;
    result.halftimeHome = 0; result.halftimeAway = 0;
  } else if (awayPunished) {
    result.homeGoals = forfeit; result.awayGoals = 0;
    result.halftimeHome = 0; result.halftimeAway = 0;
  }
}
