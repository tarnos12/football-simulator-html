/**
 * league/summary.ts — season-end summary (§4, §21): champions, promoted,
 * relegated, plus per-division threshold annotations for the table view.
 */

import type { LeagueSystem } from "../model/types";
import type { SeasonState } from "./types";

export interface DivisionOutcome {
  divisionId: string;
  name: string;
  championId?: string;
  promoted: string[];
  relegated: string[];
  qualification: string[];
}

export interface SeasonSummary {
  seasonNumber: number;
  divisions: DivisionOutcome[];
  overallChampionId?: string;
}

export function seasonSummary(league: LeagueSystem, season: SeasonState): SeasonSummary {
  const divisions: DivisionOutcome[] = [];
  let overallChampionId: string | undefined;

  league.levels.forEach((level, li) => {
    for (const div of level.divisions) {
      const ds = season.divisions.find((d) => d.divisionId === div.id);
      if (!ds) continue;
      const order = ds.table.map((r) => r.teamId);
      const phase = div.phases[div.phases.length - 1];
      const outcome: DivisionOutcome = {
        divisionId: div.id,
        name: div.name,
        promoted: [],
        relegated: [],
        qualification: [],
      };
      for (const t of phase.thresholds) {
        const slice = order.slice(t.fromPos - 1, t.toPos);
        if (t.type === "champion") outcome.championId = slice[0];
        if (t.type === "promotion") outcome.promoted.push(...slice);
        if (t.type === "relegation") outcome.relegated.push(...slice);
        if (t.type === "qualification" || t.type === "playoff") outcome.qualification.push(...slice);
      }
      if (li === 0 && order.length) overallChampionId = order[0];
      divisions.push(outcome);
    }
  });

  return { seasonNumber: season.seasonNumber, divisions, overallChampionId };
}

/** Per-team threshold label for a division table row position (1-indexed). */
export function thresholdLabelForPosition(
  league: LeagueSystem,
  divisionId: string,
  position: number,
): string | undefined {
  for (const level of league.levels) {
    const div = level.divisions.find((d) => d.id === divisionId);
    if (!div) continue;
    const phase = div.phases[div.phases.length - 1];
    for (const t of phase.thresholds) {
      if (position >= t.fromPos && position <= t.toPos) return t.label;
    }
  }
  return undefined;
}
