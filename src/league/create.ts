/**
 * league/create.ts — build a league system from a creation-wizard blueprint (§6).
 *
 * Generates teams deterministically and distributes them into same-level
 * divisions randomly or geographically. Thresholds default sensibly per tier and
 * are fully editable afterwards.
 */

import { RNG } from "../core/rng";
import { makeTeam } from "../model/factory";
import { SCHEMA_VERSION } from "../model/serialize";
import { defaultRules, type LeagueRules } from "../config";
import type {
  CupConfig,
  Division,
  LeagueSystem,
  Level,
  Team,
  Threshold,
} from "../model/types";
import { distributeGeographic, distributeRandom } from "./geographic";

export interface DivisionBlueprint {
  name: string;
  teams: number;
}
export interface LevelBlueprint {
  name: string;
  split: "random" | "geographic";
  divisions: DivisionBlueprint[];
}
export interface CreateBlueprint {
  name: string;
  seed: string;
  strength?: number;
  matchesPerPairing: number;
  levels: LevelBlueprint[];
  rules?: Partial<LeagueRules>;
  cup?: CupConfig | null;
  /** Optional explicit team names (in generation order); missing ones are random. */
  teamNames?: string[];
  promotionCount?: number;
  relegationCount?: number;
  /** Optional championship split on the top division after the main season (§6). */
  championshipSplit?: { topN: number; carry: "full" | "zero" | "half"; matchesPerPairing: number };
}

export function createLeague(rng: RNG, bp: CreateBlueprint): LeagueSystem {
  const teams: Record<string, Team> = {};
  let counter = 0;
  const names = bp.teamNames ?? [];

  const levels: Level[] = bp.levels.map((levelBp, li) => {
    // Generate the whole level's team pool, then distribute into its divisions.
    const totalTeams = levelBp.divisions.reduce((s, d) => s + d.teams, 0);
    const poolIds: string[] = [];
    for (let t = 0; t < totalTeams; t++) {
      const id = `t${counter}`;
      teams[id] = makeTeam(rng, id, names[counter]);
      poolIds.push(id);
      counter++;
    }
    const sizes = levelBp.divisions.map((d) => d.teams);
    const groups =
      levelBp.split === "geographic"
        ? distributeGeographic(poolIds, teams, sizes)
        : distributeRandom(rng, poolIds, sizes);

    const divisions: Division[] = levelBp.divisions.map((divBp, di) => {
      const thresholds = defaultThresholds(
        li, bp.levels.length, divBp.teams, bp.promotionCount ?? 2, bp.relegationCount ?? 2,
      );
      const split = li === 0 && bp.championshipSplit && divBp.teams > bp.championshipSplit.topN
        ? bp.championshipSplit
        : null;
      const phases: Division["phases"] = split
        ? [
            {
              name: "Regular season",
              matchesPerPairing: bp.matchesPerPairing,
              thresholds: [],
              split: {
                carry: split.carry,
                groups: [
                  { name: "Championship group", fromPos: 1, toPos: split.topN },
                  { name: "Relegation group", fromPos: split.topN + 1, toPos: divBp.teams },
                ],
              },
            },
            { name: "Championship split", matchesPerPairing: split.matchesPerPairing, thresholds },
          ]
        : [{ name: "Season", matchesPerPairing: bp.matchesPerPairing, thresholds }];
      return { id: `L${li}D${di}`, name: divBp.name, teamIds: groups[di] ?? [], phases };
    });
    return { id: `L${li}`, name: levelBp.name, divisions, split: levelBp.split };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    name: bp.name,
    seed: bp.seed,
    strength: bp.strength ?? 5,
    levels,
    teams,
    rules: { ...defaultRules(), ...(bp.rules ?? {}) },
    cup: bp.cup ?? null,
    configOverrides: null,
  };
}

export function defaultThresholds(
  levelIndex: number,
  levelCount: number,
  teamCount: number,
  promotionCount: number,
  relegationCount: number,
): Threshold[] {
  const thresholds: Threshold[] = [];
  const isTop = levelIndex === 0;
  const isBottom = levelIndex === levelCount - 1;
  if (isTop) {
    thresholds.push({ type: "champion", fromPos: 1, toPos: 1, label: "Champion" });
  } else {
    thresholds.push({ type: "promotion", fromPos: 1, toPos: promotionCount, label: "Promoted" });
  }
  if (!isBottom && relegationCount > 0) {
    thresholds.push({
      type: "relegation",
      fromPos: teamCount - relegationCount + 1,
      toPos: teamCount,
      label: "Relegated",
    });
  }
  return thresholds;
}
