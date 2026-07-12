/**
 * systems/motivation.ts — late-season motivation (§9).
 *
 * Once the season is within `motivationGamesFromEnd` rounds of the end, any team
 * still in contention for any threshold (champion / promotion / qualification /
 * relegation) gets a +1 Att/Def/Sta bonus, lost the moment its fate is sealed.
 *
 * Contention is judged by points reachability: a team is in contention if it sits
 * within the still-gainable points swing of a threshold cut line.
 */

import type { LeagueRules } from "../config";
import type { Division } from "../model/types";
import type { DivisionSeason } from "../league/types";

export function motivatedTeams(
  div: DivisionSeason,
  divModel: Division,
  rules: LeagueRules,
): Set<string> {
  const motivated = new Set<string>();
  const gamesRemaining = div.totalRounds - div.playedRounds;
  if (gamesRemaining <= 0 || gamesRemaining > rules.motivationGamesFromEnd) return motivated;

  const table = div.table;
  if (table.length === 0) return motivated;
  const swing = rules.pointsWin * gamesRemaining;
  const phase = divModel.phases[divModel.phases.length - 1];

  // Points at each threshold cut line (the teams bracketing each band edge).
  const boundaryPoints = new Set<number>();
  for (const t of phase.thresholds) {
    for (const pos of [t.fromPos - 1, t.fromPos, t.toPos, t.toPos + 1]) {
      const idx = pos - 1;
      if (idx >= 0 && idx < table.length) boundaryPoints.add(table[idx].points);
    }
  }

  for (const row of table) {
    for (const b of boundaryPoints) {
      if (Math.abs(row.points - b) <= swing) {
        motivated.add(row.teamId);
        break;
      }
    }
  }
  return motivated;
}
