/**
 * league/promotion.ts — resolve promotion/relegation between seasons (§6).
 *
 * From each division's final table we read the promotion and relegation
 * threshold bands. Promoted teams move up a level, relegated teams move down; each
 * level's resulting pool is then re-distributed into its divisions using the
 * level's split (random or geographic), keeping division sizes intact.
 */

import { RNG } from "../core/rng";
import { cloneLeague } from "../model/serialize";
import type { LeagueSystem } from "../model/types";
import type { SeasonState } from "./types";
import { distributeGeographic, distributeRandom } from "./geographic";
import { combinedFinalTable } from "./phases";

export interface ProRelChange {
  teamId: string;
  from: string; // division id
  to: string; // division id
  direction: "promoted" | "relegated";
}

interface DivBands {
  divisionId: string;
  levelIndex: number;
  promoted: string[];
  relegated: string[];
}

function divisionBands(league: LeagueSystem, season: SeasonState): DivBands[] {
  const bands: DivBands[] = [];
  league.levels.forEach((level, levelIndex) => {
    for (const div of level.divisions) {
      const combined = combinedFinalTable(season, div.id);
      if (combined.length === 0) continue;
      const order = combined.map((r) => r.teamId);
      const phase = div.phases[div.phases.length - 1];
      const promoted: string[] = [];
      const relegated: string[] = [];
      for (const t of phase.thresholds) {
        const slice = order.slice(t.fromPos - 1, t.toPos);
        if (t.type === "promotion") promoted.push(...slice);
        if (t.type === "relegation") relegated.push(...slice);
      }
      bands.push({ divisionId: div.id, levelIndex, promoted, relegated });
    }
  });
  return bands;
}

/**
 * Produce the next season's league system (a clone) with team membership updated
 * by promotion/relegation. Also returns the list of individual changes.
 */
export function applyPromotionRelegation(
  league: LeagueSystem,
  season: SeasonState,
  rng: RNG,
): { league: LeagueSystem; changes: ProRelChange[] } {
  const next = cloneLeague(league);
  const bands = divisionBands(league, season);
  const changes: ProRelChange[] = [];

  const relegatedFrom = (li: number) => bands.filter((b) => b.levelIndex === li).flatMap((b) => b.relegated);
  const promotedFrom = (li: number) => bands.filter((b) => b.levelIndex === li).flatMap((b) => b.promoted);

  // Track origin division for change reporting.
  const originDiv = new Map<string, string>();
  for (const b of bands) {
    for (const t of b.promoted) originDiv.set(t, b.divisionId);
    for (const t of b.relegated) originDiv.set(t, b.divisionId);
  }

  next.levels.forEach((level, li) => {
    const current = new Set(level.divisions.flatMap((d) => d.teamIds));
    // Remove teams leaving this level.
    for (const t of promotedFrom(li)) current.delete(t); // go up
    for (const t of relegatedFrom(li)) current.delete(t); // go down
    // Add teams arriving.
    if (li > 0) for (const t of relegatedFrom(li - 1)) current.add(t); // came down
    if (li < next.levels.length - 1) for (const t of promotedFrom(li + 1)) current.add(t); // came up

    const pool = [...current];
    const sizes = level.divisions.map((d) => d.teamIds.length);
    const groups =
      level.split === "geographic"
        ? distributeGeographic(pool, next.teams, sizes)
        : distributeRandom(rng, pool, sizes);
    level.divisions.forEach((d, i) => {
      d.teamIds = groups[i] ?? [];
    });
  });

  // Report changes (team moved to a different division).
  const newDivOf = new Map<string, string>();
  for (const level of next.levels) for (const d of level.divisions) for (const t of d.teamIds) newDivOf.set(t, d.id);
  for (const [teamId, from] of originDiv) {
    const to = newDivOf.get(teamId);
    if (to && to !== from) {
      const wasPromoted = promotedFromAny(bands, teamId);
      changes.push({ teamId, from, to, direction: wasPromoted ? "promoted" : "relegated" });
    }
  }
  return { league: next, changes };
}

function promotedFromAny(bands: DivBands[], teamId: string): boolean {
  return bands.some((b) => b.promoted.includes(teamId));
}
