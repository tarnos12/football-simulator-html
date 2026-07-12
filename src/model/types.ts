/**
 * model/types.ts — the frozen interface contract for the whole team.
 *
 * Pure TypeScript, no React. These shapes are the shared vocabulary every module
 * builds against; changing them is a lead-ratified contract change.
 */

import type {
  CoachAttributeId,
  JerseyPattern,
  LeagueRules,
  TieBreak,
  WeatherKind,
} from "../config";

export type Ownership = "capitalistic" | "fans";

export interface Location {
  x: number; // −10..+10 (no 0)
  y: number; // −10..+10 (no 0)
}

export interface Jersey {
  shirtColors: string[]; // 2–3 hex colours
  shirtPattern: JerseyPattern;
  shortColors: string[]; // 2–3 hex colours
}

export interface Coach {
  name: string;
  skill: number; // 1–5
  attributes: CoachAttributeId[];
  yearsInPost: number; // for between-season change odds
}

/** §5 Team Card — the full definition of a team. */
export interface Team {
  id: string;
  name: string;
  attack: number; // 1–9
  defence: number; // 1–9
  stamina: number; // 1–9
  form: number; // +2..−2 (decimals)
  coach: Coach;
  clubSize: number; // 1–9
  organisation: number; // 1–9
  ownership: Ownership;
  location: Location;
  jersey: Jersey;
}

/** A single threshold line within a division phase (§6). */
export type ThresholdType =
  | "champion"
  | "promotion"
  | "qualification"
  | "playoff"
  | "relegation";

export interface Threshold {
  type: ThresholdType;
  /** Positions (1-indexed, inclusive) this threshold covers, e.g. [1,1] champion. */
  fromPos: number;
  toPos: number;
  label: string;
}

/** A phase of a division's season (§6): a set of rounds then threshold resolution. */
export interface DivisionPhase {
  name: string;
  /** How many times each pairing plays within this phase. */
  matchesPerPairing: number;
  thresholds: Threshold[];
  /** Optional split: if set, after this phase teams split into sub-groups by position. */
  split?: { groups: { name: string; fromPos: number; toPos: number }[]; carry: "full" | "zero" | "half" };
}

export interface Division {
  id: string;
  name: string;
  teamIds: string[];
  phases: DivisionPhase[];
  /** Optional per-division rule overrides (undefined ⇒ inherit league rules). */
  rulesOverride?: Partial<LeagueRules>;
}

export interface Level {
  id: string;
  name: string;
  divisions: Division[];
  /** How same-level divisions were populated. */
  split: "random" | "geographic";
}

export type CupFormat = "knockout" | "groupThenKnockout";

export interface CupConfig {
  enabled: boolean;
  name: string;
  format: CupFormat;
  /** Team ids entering the cup (usually all teams). */
  teamIds: string[];
  groupSize: number; // for group stage
  advancePerGroup: number;
  finalNeutralGround: boolean;
  rulesOverride?: Partial<LeagueRules>;
  /** Teams that auto-pass the first knockout round (e.g. top-division sides) (§14). */
  byeTeamIds?: string[];
  /** Seeded teams spread one-per-group in a group stage (§14). */
  seedTeamIds?: string[];
}

/** The complete, shareable league system (§22). */
export interface LeagueSystem {
  schemaVersion: number;
  name: string;
  seed: string;
  strength: number; // 1–9 for international play (§19)
  levels: Level[];
  teams: Record<string, Team>;
  rules: LeagueRules;
  cup: CupConfig | null;
  /** Optional creator overrides of hidden balance tables (§23). */
  configOverrides: Record<string, unknown> | null;
}

// ── Match & season runtime state (produced by sim/ and league/) ──────────────

export interface HalfDetail {
  homeGoals: number;
  awayGoals: number;
  homeRoll: number; // 2D6 + coach adjustment actually used for lookup
  awayRoll: number;
  homeDiff: number; // effective team difference fed into the goal table
  awayDiff: number;
}

export interface IncidentMarker {
  kind: "corruption" | "crowd";
  teamId: string;
  reason: string;
  pointsLost?: number; // corruption
}

export interface MatchResult {
  homeId: string;
  awayId: string;
  homeGoals: number;
  awayGoals: number;
  halftimeHome: number;
  halftimeAway: number;
  halves: [HalfDetail, HalfDetail];
  weather: WeatherKind;
  attendance: number;
  neutralGround: boolean;
  derby: boolean;
  motivationHome: boolean;
  motivationAway: boolean;
  incidents: IncidentMarker[];
  /** Overtime / penalties, when a decider needed a winner. */
  decidedBy?: "overtime" | "penalties";
  penaltyScore?: { home: number; away: number };
  winnerId?: string; // for knockout / decider contexts
}

export interface ScheduledMatch {
  round: number;
  homeId: string;
  awayId: string;
  neutralGround?: boolean;
  result?: MatchResult;
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  startingPoints: number; // corruption deductions
  /** position history for the per-game position chart. */
  positionHistory: number[];
}

export type { LeagueRules, TieBreak };
