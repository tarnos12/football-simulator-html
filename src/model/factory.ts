/**
 * model/factory.ts — construct model instances (teams, coaches, a league shell).
 *
 * Pure and deterministic: every random choice draws from a passed-in RNG, so the
 * same seed builds the same league. Balance-driven distributions (coach skill,
 * attribute counts) come from `config.ts`, never inline literals.
 */

import { RNG } from "../core/rng";
import {
  COACH,
  COACH_ATTRIBUTES,
  CoachAttributeId,
  GRID,
  JERSEY_PATTERNS,
  defaultRules,
} from "../config";
import type {
  Coach,
  Division,
  Jersey,
  LeagueSystem,
  Level,
  Location,
  Team,
} from "./types";
import { SCHEMA_VERSION } from "./serialize";

const JERSEY_COLORS = [
  "#e63946", "#f1faee", "#a8dadc", "#457b9d", "#1d3557", "#ffb703", "#fb8500",
  "#023047", "#2a9d8f", "#264653", "#e76f51", "#8338ec", "#3a86ff", "#06d6a0",
  "#ef476f", "#ffd166", "#118ab2", "#073b4c", "#000000", "#ffffff",
];

const CITY_NAMES = [
  "Lunds", "Malmö", "Göteborg", "Aros", "Nortown", "Southgate", "Easthaven",
  "Westford", "Rivermouth", "Kingsbridge", "Hillcrest", "Fairport", "Oakvale",
  "Stormont", "Ashfield", "Brightwater", "Cedarhill", "Dunmore", "Elmgrove",
  "Foxdale", "Granby", "Havenport", "Ironside", "Jarlton", "Kestrel", "Lakemoor",
  "Marsh End", "Newbury", "Old Harbour", "Peakford", "Quarrytown", "Redcliff",
  "Silverbrook", "Thornwick", "Underhill", "Valemont", "Whitby", "Yorkgate",
  "Zenith", "Aldervale", "Bramblewood", "Crestfall", "Dawnmere", "Everwood",
];

const CLUB_SUFFIXES = ["BK", "FC", "United", "City", "Athletic", "Rovers", "Town", "Wanderers", "Albion"];

/** Generate a coach for a club of the given size (§12). */
export function makeCoach(rng: RNG, clubSize: number): Coach {
  const skillDist = COACH.skillByClubSize[clamp(clubSize, 1, 9)];
  const skill = rng.weightedIndex(skillDist) + 1; // skills are 1..5

  const count = rng.weightedIndex(COACH.attributeCount) + 1; // 1..3 attributes
  const positives = COACH_ATTRIBUTES.filter((a) => a.positive).map((a) => a.id);
  const negatives = COACH_ATTRIBUTES.filter((a) => !a.positive).map((a) => a.id);

  let attributes: CoachAttributeId[];
  if (count === 1) {
    const pool = rng.chance(0.5) ? positives : negatives;
    attributes = [rng.pick(pool)];
  } else if (count === 2) {
    const mode = rng.weightedIndex(COACH.twoAttrSplit); // 0: mix, 1: two good, 2: two bad
    if (mode === 1) attributes = pickN(rng, positives, 2);
    else if (mode === 2) attributes = pickN(rng, negatives, 2);
    else attributes = [rng.pick(positives), rng.pick(negatives)];
  } else {
    // Three attributes, must be a mix (never all-good or all-bad).
    const goodCount = rng.chance(0.5) ? 1 : 2;
    attributes = [...pickN(rng, positives, goodCount), ...pickN(rng, negatives, 3 - goodCount)];
  }

  return { name: coachName(rng), skill, attributes, yearsInPost: 1 };
}

/** Generate a random team card. */
export function makeTeam(rng: RNG, id: string, name?: string): Team {
  const clubSize = rng.int(1, 9);
  return {
    id,
    name: name ?? teamName(rng),
    attack: rng.int(1, 9),
    defence: rng.int(1, 9),
    stamina: rng.int(1, 9),
    // Season-start form is random +0.5..−0.5 (§5).
    form: roundForm(rng.next() - 0.5),
    coach: makeCoach(rng, clubSize),
    clubSize,
    organisation: rng.int(1, 9),
    ownership: rng.chance(0.5) ? "capitalistic" : "fans",
    location: randomLocation(rng),
    jersey: randomJersey(rng),
  };
}

export function randomLocation(rng: RNG): Location {
  return { x: nonZero(rng), y: nonZero(rng) };
}

export function randomJersey(rng: RNG): Jersey {
  const nColors = rng.int(2, 3);
  return {
    shirtColors: pickN(rng, JERSEY_COLORS, nColors),
    shirtPattern: rng.pick(JERSEY_PATTERNS),
    shortColors: pickN(rng, JERSEY_COLORS, rng.int(2, 3)),
  };
}

export interface LeagueBlueprint {
  name: string;
  seed: string;
  levels: { name: string; divisions: { name: string; teams: number }[] }[];
  matchesPerPairing: number;
  split: "random" | "geographic";
}

/**
 * Build a league shell with generated teams distributed into divisions.
 * Geographic distribution is refined in `league/` (Phase 3); here we place teams
 * in generation order, which `league/` may re-sort by location.
 */
export function buildLeagueSystem(rng: RNG, bp: LeagueBlueprint): LeagueSystem {
  const teams: Record<string, Team> = {};
  const levels: Level[] = [];
  let teamCounter = 0;

  for (let li = 0; li < bp.levels.length; li++) {
    const levelBp = bp.levels[li];
    const divisions: Division[] = [];
    for (let di = 0; di < levelBp.divisions.length; di++) {
      const divBp = levelBp.divisions[di];
      const teamIds: string[] = [];
      for (let t = 0; t < divBp.teams; t++) {
        const id = `t${teamCounter++}`;
        teams[id] = makeTeam(rng, id);
        teamIds.push(id);
      }
      divisions.push({
        id: `L${li}D${di}`,
        name: divBp.name,
        teamIds,
        phases: [
          {
            name: "Season",
            matchesPerPairing: bp.matchesPerPairing,
            thresholds: defaultThresholds(li, bp.levels.length, divBp.teams),
          },
        ],
      });
    }
    levels.push({ id: `L${li}`, name: levelBp.name, divisions, split: bp.split });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    name: bp.name,
    seed: bp.seed,
    strength: 5,
    levels,
    teams,
    rules: defaultRules(),
    cup: null,
    configOverrides: null,
  };
}

/** Sensible default promotion/relegation lines for a tier. */
function defaultThresholds(
  levelIndex: number,
  levelCount: number,
  teamCount: number,
): Division["phases"][number]["thresholds"] {
  const thresholds: Division["phases"][number]["thresholds"] = [];
  const isTop = levelIndex === 0;
  const isBottom = levelIndex === levelCount - 1;
  if (isTop) {
    thresholds.push({ type: "champion", fromPos: 1, toPos: 1, label: "Champion" });
  } else {
    thresholds.push({ type: "promotion", fromPos: 1, toPos: 2, label: "Promoted" });
  }
  if (!isBottom) {
    thresholds.push({
      type: "relegation",
      fromPos: teamCount - 1,
      toPos: teamCount,
      label: "Relegated",
    });
  }
  return thresholds;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function teamName(rng: RNG): string {
  return `${rng.pick(CITY_NAMES)} ${rng.pick(CLUB_SUFFIXES)}`;
}

const COACH_FIRST = ["Sven", "Erik", "Johan", "Marco", "Diego", "Pep", "Luis", "Anders", "Nils", "Karl", "Otto", "Rune", "Bo", "Lars", "Ove", "Ada", "Mia", "Ines"];
const COACH_LAST = ["Ericsson", "Lindqvist", "Bianchi", "Fernández", "Kovač", "Novak", "Berg", "Holm", "Sandberg", "Falk", "Ström", "Dahl", "Ek", "Lund", "Vidić"];

function coachName(rng: RNG): string {
  return `${rng.pick(COACH_FIRST)} ${rng.pick(COACH_LAST)}`;
}

function pickN<T>(rng: RNG, pool: readonly T[], n: number): T[] {
  const copy = [...pool];
  rng.shuffle(copy);
  return copy.slice(0, Math.min(n, copy.length));
}

function nonZero(rng: RNG): number {
  // Grid is −10..+10 with no 0.
  const v = rng.int(GRID.min, GRID.max - 1);
  return v >= 0 ? v + 1 : v;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function roundForm(v: number): number {
  // Keep form on the 0.01 grid the workbook uses.
  return Math.round(v * 100) / 100;
}
