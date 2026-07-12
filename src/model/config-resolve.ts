/**
 * model/config-resolve.ts — resolve creator-editable tables (§23).
 *
 * Hidden tables live in `config.ts` as committed defaults. A league may override
 * any of them in `configOverrides` (saved with the shareable state). These
 * helpers return the effective value: the override if present, else the default.
 */

import { CORRUPTION, CROWD, GOAL_TABLE } from "../config";
import type { LeagueSystem } from "./types";

export interface ConfigOverrides {
  corruptionReasons?: string[];
  crowdReasons?: string[];
  goalTable?: number[][];
}

export function overridesOf(league: LeagueSystem): ConfigOverrides {
  return (league.configOverrides ?? {}) as ConfigOverrides;
}

export function corruptionReasons(league: LeagueSystem): string[] {
  return overridesOf(league).corruptionReasons ?? [...CORRUPTION.reasons];
}

export function crowdReasons(league: LeagueSystem): string[] {
  return overridesOf(league).crowdReasons ?? [...CROWD.reasons];
}

export function goalTableOf(league: LeagueSystem): readonly (readonly number[])[] {
  return overridesOf(league).goalTable ?? GOAL_TABLE;
}

/** Set an override key on a league in place (used by creator tools). */
export function setOverride<K extends keyof ConfigOverrides>(
  league: LeagueSystem,
  key: K,
  value: ConfigOverrides[K],
): void {
  league.configOverrides = { ...(league.configOverrides ?? {}), [key]: value };
}
