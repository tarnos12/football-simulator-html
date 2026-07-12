/**
 * league/types.ts — runtime season state (not part of the shareable save, which
 * is `model/`; a season replays deterministically from the league + seed).
 */

import type { ScheduledMatch, TableRow } from "../model/types";

export interface DivisionSeason {
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
}

export interface SeasonState {
  seasonNumber: number;
  divisions: DivisionSeason[];
  complete: boolean;
}
