/**
 * systems/corruption.ts — season-start corruption (§17).
 *
 * If enabled for a division, each team rolls a per-season catch chance (by
 * frequency L/M/H). The honourable coach trait negates it; the corruptible trait
 * adds risk. A caught team starts on minus points (a random value in the span)
 * with a random reason marker.
 */

import { RNG } from "../core/rng";
import { CORRUPTION } from "../config";
import type { LeagueRules } from "../config";
import type { LeagueSystem } from "../model/types";

export interface CorruptionMarker {
  divisionId: string;
  teamId: string;
  reason: string;
  pointsLost: number;
}

export interface CorruptionResult {
  /** startingPoints[divisionId][teamId] = negative points. */
  startingPoints: Record<string, Record<string, number>>;
  markers: CorruptionMarker[];
}

function divisionRules(league: LeagueSystem, override?: Partial<LeagueRules>): LeagueRules {
  return { ...league.rules, ...(override ?? {}) };
}

export function computeCorruption(league: LeagueSystem, season: number, rng: RNG): CorruptionResult {
  const startingPoints: Record<string, Record<string, number>> = {};
  const markers: CorruptionMarker[] = [];

  for (const level of league.levels) {
    for (const div of level.divisions) {
      const rules = divisionRules(league, div.rulesOverride);
      if (!rules.corruption) continue;
      const baseRate = CORRUPTION.catchRate[rules.corruptionFrequency];
      const span = rules.corruptionSpan;

      for (const teamId of div.teamIds) {
        const team = league.teams[teamId];
        if (team.coach.attributes.includes("honourable")) continue; // negates
        let rate = baseRate;
        if (team.coach.attributes.includes("corruptible")) rate += CORRUPTION.corruptibleTraitBonus;
        // Independent stream per team so ordering never matters.
        const teamRng = new RNG(`${league.seed}::corruption::s${season}::${teamId}`);
        void rng;
        if (!teamRng.chance(rate)) continue;
        const pointsLost = teamRng.int(span.min, span.max); // both negative; min ≤ max
        const reason = teamRng.pick(CORRUPTION.reasons);
        (startingPoints[div.id] ??= {})[teamId] = pointsLost;
        markers.push({ divisionId: div.id, teamId, reason, pointsLost });
      }
    }
  }
  return { startingPoints, markers };
}
