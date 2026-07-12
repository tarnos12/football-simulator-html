/**
 * league/phases.ts — multi-phase league splits (§6). Pure, deterministic.
 *
 * After a phase completes, a division whose model phase defines a `split` regroups
 * its teams by position into sub-league groups (e.g. a top-6 / bottom-6 split),
 * carrying points forward (full / zero / half-rounded-down), and each group plays
 * its own round-robin as the next phase. Promotion/relegation then reads the
 * combined final ordering (top group first).
 */

import type { Division, LeagueSystem, TableRow } from "../model/types";
import { computeTable, orderTable } from "./standings";
import { generateSchedule, roundCount } from "./schedule";
import type { DivisionSeason, SeasonState } from "./types";

function modelDivision(league: LeagueSystem, sourceId: string): Division {
  return league.levels.flatMap((l) => l.divisions).find((d) => d.id === sourceId)!;
}

/**
 * Spawn the next phase's groups for any completed division-season whose model
 * phase defines a split. Returns the number of new groups created.
 */
export function advancePhases(league: LeagueSystem, season: SeasonState): number {
  let spawned = 0;
  for (const ds of [...season.divisions]) {
    if (ds.spawnedNext) continue;
    if (ds.playedRounds < ds.totalRounds) continue;
    const model = modelDivision(league, ds.sourceDivisionId);
    const split = model.phases[ds.phaseIndex]?.split;
    if (!split) continue;

    const rules = { ...league.rules, ...(model.rulesOverride ?? {}) };
    const nextPhase = model.phases[ds.phaseIndex + 1];
    const mpp = nextPhase?.matchesPerPairing ?? 2;

    split.groups.forEach((g, gi) => {
      const groupRows = ds.table.slice(g.fromPos - 1, g.toPos);
      const teamIds = groupRows.map((r) => r.teamId);
      if (teamIds.length < 2) return;
      const startingPoints: Record<string, number> = {};
      for (const r of groupRows) {
        startingPoints[r.teamId] =
          split.carry === "full" ? r.points : split.carry === "half" ? Math.floor(r.points / 2) : 0;
      }
      const schedule = generateSchedule(teamIds, mpp, rules.mirroring);
      const child: DivisionSeason = {
        divisionId: `${ds.divisionId}#p${ds.phaseIndex + 1}g${gi}`,
        levelId: ds.levelId,
        name: `${model.name} — ${g.name}`,
        teamIds,
        schedule,
        totalRounds: roundCount(schedule),
        playedRounds: 0,
        startingPoints,
        table: [],
        markers: [],
        sourceDivisionId: ds.sourceDivisionId,
        phaseIndex: ds.phaseIndex + 1,
        groupName: g.name,
      };
      child.table = orderTable(computeTable(teamIds, schedule, rules, startingPoints), schedule, rules);
      season.divisions.push(child);
      spawned++;
    });
    ds.spawnedNext = true;
  }
  season.complete = season.divisions.every((d) => d.playedRounds >= d.totalRounds);
  return spawned;
}

/** The deepest-phase group-seasons for a source division (top group first). */
export function finalGroupsFor(season: SeasonState, sourceId: string): DivisionSeason[] {
  const all = season.divisions.filter((d) => d.sourceDivisionId === sourceId);
  if (all.length === 0) return [];
  const maxPhase = Math.max(...all.map((d) => d.phaseIndex));
  return all.filter((d) => d.phaseIndex === maxPhase);
}

/** Combined final standings for a source division (concatenate groups, top first). */
export function combinedFinalTable(season: SeasonState, sourceId: string): TableRow[] {
  return finalGroupsFor(season, sourceId).flatMap((g) => g.table);
}

/** All results across every phase of a source division. */
export function allResultsForSource(season: SeasonState, sourceId: string) {
  return season.divisions
    .filter((d) => d.sourceDivisionId === sourceId)
    .flatMap((d) => d.schedule.filter((m) => m.result).map((m) => m.result!));
}

/** Whether any division in the league defines a split (i.e. is multi-phase). */
export function hasMultiPhase(league: LeagueSystem): boolean {
  return league.levels.some((l) => l.divisions.some((d) => d.phases.some((p) => p.split)));
}
