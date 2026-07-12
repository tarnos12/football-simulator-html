/**
 * league/types.ts — runtime season state (not part of the shareable save, which
 * is `model/`; a season replays deterministically from the league + seed).
 */

import type { ScheduledMatch, TableRow } from "../model/types";

export interface DivisionSeason {
  /** Unique key for this competition group (source id for phase 0, suffixed later). */
  divisionId: string;
  levelId: string;
  name: string;
  teamIds: string[];
  schedule: ScheduledMatch[];
  totalRounds: number;
  playedRounds: number;
  /** Corruption/other starting-point deductions (§17), applied at season start. */
  startingPoints: Record<string, number>;
  /** Ordered current standings, each row carrying its per-round position history. */
  table: TableRow[];
  /** Incident/corruption markers to surface in the table (Phase 4). */
  markers?: { teamId: string; kind: "corruption" | "crowd"; reason: string; pointsLost?: number }[];
  // Multi-phase support (§6):
  /** The model division this group derives from (equals divisionId for phase 0). */
  sourceDivisionId: string;
  /** Which model phase this group plays (0 = the main season). */
  phaseIndex: number;
  /** Display name of the split group, if this is a post-split mini-league. */
  groupName?: string;
  /** Set once this group has spawned its next phase (so it isn't spawned twice). */
  spawnedNext?: boolean;
}

export interface SeasonState {
  seasonNumber: number;
  divisions: DivisionSeason[];
  complete: boolean;
}
