/**
 * config.ts — THE single home for every balance constant / hidden table.
 *
 * Every number here is transcribed **verbatim** from the source workbook
 * (`docs/source-workbook/`). No rounding, "improving", or rebalancing. The only
 * deviations are the provable discrepancies logged in
 * `docs/GDD-discrepancies.md` (home advantage = Att/Def; snow cap default off;
 * very-warm removes the H1 stamina halving).
 *
 * All tables are creator-editable at runtime: the app clones DEFAULT_CONFIG into
 * editable state, so the committed defaults always stay the GDD/workbook values.
 */

// ─────────────────────────────────────────────────────────────────────────────
// §8.1 GOAL TABLE
// Rows = effective team difference (+12..−12), columns = 2D6 roll (2..16, where
// 13..16 are only reachable via the coach-skill difference). Cell = goals scored.
// ─────────────────────────────────────────────────────────────────────────────

/** Roll columns of the goal table, in order. */
export const GOAL_TABLE_ROLLS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

/** Difference rows of the goal table, from +12 (index 0) down to −12 (index 24). */
export const GOAL_TABLE_DIFFS = [
  12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12,
] as const;

// prettier-ignore
export const GOAL_TABLE: readonly (readonly number[])[] = [
  /* +12 */ [0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7],
  /* +11 */ [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
  /* +10 */ [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6],
  /*  +9 */ [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
  /*  +8 */ [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6],
  /*  +7 */ [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  /*  +6 */ [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  /*  +5 */ [0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
  /*  +4 */ [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5],
  /*  +3 */ [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5],
  /*  +2 */ [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5],
  /*  +1 */ [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4],
  /*   0 */ [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4],
  /*  −1 */ [0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4],
  /*  −2 */ [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
  /*  −3 */ [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
  /*  −4 */ [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4],
  /*  −5 */ [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3],
  /*  −6 */ [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3],
  /*  −7 */ [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3],
  /*  −8 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3],
  /*  −9 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 3],
  /* −10 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2],
  /* −11 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2],
  /* −12 */ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2],
];

/** Look up goals scored for an effective difference and a (possibly >12) roll. */
export function goalTableLookup(diff: number, roll: number): number {
  const clampedDiff = Math.max(-12, Math.min(12, diff));
  const rowIndex = 12 - clampedDiff; // diff +12 → row 0, diff −12 → row 24
  const clampedRoll = Math.max(2, Math.min(16, roll));
  const colIndex = clampedRoll - 2;
  return GOAL_TABLE[rowIndex][colIndex];
}

// ─────────────────────────────────────────────────────────────────────────────
// §8–9 MATCH MODIFIERS
// ─────────────────────────────────────────────────────────────────────────────

export const MATCH = {
  /** "Who has the day" — one roll per team, this range, applied to Att/Def/Sta. */
  whoHasTheDay: { min: 0, max: 3 },
  /** Home advantage stat bonuses. Workbook worked example: Att/Def only (see discrepancy #1). */
  homeAdvantage: { att: 1, def: 1, sta: 0 },
  /** Big-team advantage: if club-size difference ≥ this, bigger club gets +att/+def. */
  bigTeam: { sizeDiffThreshold: 3, att: 1, def: 1, sta: 0 },
  /** Motivation bonus for teams still in contention for any threshold. */
  motivation: { att: 1, def: 1, sta: 1 },
  /** Coach skill difference is added to the better coach's 2D6 roll, capped here. */
  coachSkillMaxDiff: 4,
  /** First half halves the stamina differential (rounded toward zero). */
  firstHalfStaminaDivisor: 2,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §10 WEATHER
// ─────────────────────────────────────────────────────────────────────────────

export type WeatherKind =
  | "sunny"
  | "lightOvercast"
  | "heavyOvercast"
  | "lightRain"
  | "heavyRain"
  | "snowing"
  | "muddy"
  | "windy"
  | "veryWarm";

export const WEATHER_ICON: Record<WeatherKind, string> = {
  sunny: "☀️",
  lightOvercast: "🌤️",
  heavyOvercast: "☁️",
  lightRain: "🌦️",
  heavyRain: "⛈️",
  snowing: "❄️",
  muddy: "🕳️",
  windy: "💨",
  veryWarm: "🔥",
};

export const WEATHER_LABEL: Record<WeatherKind, string> = {
  sunny: "Sunny",
  lightOvercast: "Light overcast",
  heavyOvercast: "Heavy overcast",
  lightRain: "Light rain",
  heavyRain: "Heavy rain",
  snowing: "Snowing",
  muddy: "Muddy",
  windy: "Windy",
  veryWarm: "Very warm",
};

/** Plain-language description of each condition's gameplay impact (no numbers to players). */
export const WEATHER_GAMEPLAY_TEXT: Record<WeatherKind, string> = {
  sunny: "Clear skies — no effect on play.",
  lightOvercast: "A few clouds — no effect on play.",
  heavyOvercast: "Grey skies — no effect on play.",
  lightRain: "A slick pitch helps attackers on both sides.",
  heavyRain: "A waterlogged pitch blunts the strongest attacks and defences.",
  snowing: "Snow on the pitch makes for a strange game.",
  muddy: "A heavy pitch favours defenders on both sides.",
  windy: "A swirling wind unsettles both teams for a spell.",
  veryWarm: "Sweltering heat saps the fitter side's stamina edge early on.",
};

export const WEATHER = {
  /** Climate gates which conditions can appear. */
  climates: {
    warm: { snow: false, veryWarm: true },
    temperate: { snow: true, veryWarm: true },
    cold: { snow: true, veryWarm: false },
  },
  /** Gameplay effects (from the workbook "Location and Weather" sheet). */
  effects: {
    lightRain: { attBoth: 1 },
    heavyRain: { attDefCap: 5 },
    muddy: { defBoth: 1 },
    windy: { attHalf: 1, defHalf: 1 }, // applied to one half each
    veryWarm: { removeFirstHalfStaminaHalving: true },
    snow: { staminaCap: 5, staminaCapEnabled: false }, // [OPEN] discrepancy #2 — default off
  },
  /** Generation probabilities per week (GDD §10; tunable). */
  generation: {
    heavyRain: { first: 0.3, second: 0.2, third: 0.1 },
    lightRainAlone: { tenCells: 0.7, fiveMore: 0.3 },
    snow: { firstBlock: 0.15, secondBlock: 0.5, blockSize: 3 },
    muddyCells: 5,
    windy: [0.8, 0.6, 0.4], // three independent checks, 5 cells each
    windyCellsPerCheck: 5,
    veryWarm: { firstBlock: 0.15, secondBlock: 0.5, blockSize: 3 },
    // Remaining empty cells split ⅓ / ⅓ / ⅓
    fillSplit: { sunny: 1 / 3, lightOvercast: 1 / 3, heavyOvercast: 1 / 3 },
  },
  /** Attendance effects (from "TeamCoachAttendence"): [home%, away%] multipliers. */
  attendance: {
    sunny: { home: 0.1, away: 0.1 },
    lightOvercast: { home: 0.1, away: 0 },
    heavyOvercast: { home: 0, away: 0 },
    lightRain: { home: -0.1, away: -0.1 },
    heavyRain: { home: -0.5, away: -0.5 },
    snowing: { home: -0.2, away: -0.75 },
    muddy: { home: 0, away: 0 },
    windy: { home: 0, away: 0 },
    veryWarm: { home: -0.1, away: -0.1 },
  } as Record<WeatherKind, { home: number; away: number }>,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §13 ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

export const ATTENDANCE = {
  /** Base crowd by club size 1..9: [homeCrowd, awayCrowd]. */
  base: {
    9: { home: 40000, away: 4000 },
    8: { home: 30000, away: 3000 },
    7: { home: 25000, away: 2500 },
    6: { home: 20000, away: 2000 },
    5: { home: 15000, away: 1500 },
    4: { home: 10000, away: 1000 },
    3: { home: 8000, away: 800 },
    2: { home: 5000, away: 500 },
    1: { home: 2000, away: 200 },
  } as Record<number, { home: number; away: number }>,
  /** Share of the away base that travels, by grid-cell distance. */
  distance: [
    { maxCells: 2, factor: 1.0 },
    { maxCells: 5, factor: 0.6 },
    { maxCells: 9, factor: 0.4 },
    { maxCells: 14, factor: 0.2 },
    { maxCells: Infinity, factor: 0.0 },
  ],
  derbyAwayMultiplier: 3,
  coachTraitPercent: 0.1, // Fun and Games +10% / Yawnfest −10%
  dice: { maxPercent: 30 }, // roll2 in 1..30, roll1 odd/even decides sign
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §12 COACHES
// ─────────────────────────────────────────────────────────────────────────────

export type CoachAttributeId =
  | "attackUp" | "defenceUp" | "staminaUp" | "whoHasDayUp"
  | "formUp" | "attendanceUp" | "penaltyUp" | "motivationUp"
  | "loyal" | "assistant" | "honourable"
  | "attackDown" | "defenceDown" | "staminaDown" | "whoHasDayDown"
  | "formDown" | "attendanceDown" | "penaltyDown" | "motivationDown"
  | "needyDiva" | "iKnowBest" | "corruptible";

export interface CoachAttributeDef {
  id: CoachAttributeId;
  name: string;
  positive: boolean;
  effect: string;
  hover: string;
}

export const COACH_ATTRIBUTES: readonly CoachAttributeDef[] = [
  { id: "attackUp", name: "Back of the net!", positive: true, effect: "+1 Attack", hover: "This coach increases the team's attack skill." },
  { id: "defenceUp", name: "Get it outta here!", positive: true, effect: "+1 Defence", hover: "This coach increases the team's defence skill." },
  { id: "staminaUp", name: "We run 'til we die", positive: true, effect: "+1 Stamina", hover: "This coach increases the team's stamina skill." },
  { id: "whoHasDayUp", name: "Inspirational", positive: true, effect: "+1 to Who has the day", hover: "Things have a way of going well for this coach." },
  { id: "formUp", name: "Always fine-tuning", positive: true, effect: "Higher chance form increases after a match", hover: "This coach has a higher chance to strengthen the team's form." },
  { id: "attendanceUp", name: "Fun and games", positive: true, effect: "+10% attendance (home & away)", hover: "This team has extra attendance because of the way the coach plays." },
  { id: "penaltyUp", name: "Ice cold", positive: true, effect: "70% chance to win a penalty shootout", hover: "Cool under pressure — higher chance to win a penalty shootout." },
  { id: "motivationUp", name: "Firestarter", positive: true, effect: "+1 to motivational bonus (if team has it)", hover: "This coach increases the team's motivational bonus." },
  { id: "loyal", name: "Loveable", positive: true, effect: "−30% risk to leave the club after a season", hover: "This coach is so loved, they might never get fired." },
  { id: "assistant", name: "Amazing support staff", positive: true, effect: "+1 Coach skill (max 4 diff to other coach)", hover: "Surrounded by the best assistants, giving a boost to their skill." },
  { id: "honourable", name: "True to their honor", positive: true, effect: "Negates any chance the team is caught in corruption", hover: "This coach is honourable and true — never corrupt." },
  { id: "attackDown", name: "One too many passes", positive: false, effect: "−1 Attack", hover: "This coach decreases the team's attack skill." },
  { id: "defenceDown", name: "Defence Schmefence", positive: false, effect: "−1 Defence", hover: "This coach decreases the team's defence skill." },
  { id: "staminaDown", name: "Let them come to us", positive: false, effect: "−1 Stamina", hover: "This coach decreases the team's stamina skill." },
  { id: "whoHasDayDown", name: "Dull and dim", positive: false, effect: "−1 to Who has the day", hover: "The gods rarely smile on this coach." },
  { id: "formDown", name: "Whatever will be, will be", positive: false, effect: "Higher risk form decreases after a match", hover: "This coach has a higher chance to weaken the team's form." },
  { id: "attendanceDown", name: "Yawnfest", positive: false, effect: "−10% attendance (home & away)", hover: "This coach draws less attendance because of a boring type of play." },
  { id: "penaltyDown", name: "Cursed", positive: false, effect: "Only 30% chance to win a penalty shootout", hover: "Can't control their nerves — higher risk to lose a penalty shootout." },
  { id: "motivationDown", name: "Status Quo", positive: false, effect: "Negates the team's motivational bonus", hover: "This coach removes his own team's motivational bonus." },
  { id: "needyDiva", name: "Needy Diva", positive: false, effect: "+30% risk to leave the club after a season", hover: "This coach is making enemies with everyone and might get fired." },
  { id: "iKnowBest", name: "I know the best", positive: false, effect: "−1 Coach skill (max 4 diff to other coach)", hover: "This coach doesn't listen to anybody, lowering their own skill." },
  { id: "corruptible", name: "Cozy with the goodfellas", positive: false, effect: "+20% risk to be caught in corruption", hover: "This coach has a higher risk to be involved in corruption." },
];

export const COACH = {
  /** Attribute-count distribution: [1 attr, 2 attrs, 3 attrs]. */
  attributeCount: [0.3, 0.6, 0.1],
  /** For a 2-attribute coach: [one good+one bad, two good, two bad]. */
  twoAttrSplit: [0.8, 0.1, 0.1],
  /** Loyalty/diva season-leave risk modifiers. */
  loyalLeaveModifier: -0.3,
  divaLeaveModifier: 0.3,
  /** Skill distribution by club size 1..9, over skills [1,2,3,4,5]. */
  skillByClubSize: {
    9: [0.05, 0.15, 0.35, 0.3, 0.15],
    8: [0.05, 0.2, 0.35, 0.3, 0.1],
    7: [0.05, 0.2, 0.35, 0.3, 0.1],
    6: [0.05, 0.2, 0.4, 0.25, 0.1],
    5: [0.05, 0.25, 0.4, 0.25, 0.05],
    4: [0.1, 0.25, 0.4, 0.2, 0.05],
    3: [0.1, 0.3, 0.35, 0.2, 0.05],
    2: [0.1, 0.3, 0.35, 0.2, 0.05],
    1: [0.15, 0.3, 0.35, 0.15, 0.05],
  } as Record<number, number[]>,
  penaltyWinBase: 0.5,
  penaltyTraitWin: 0.7, // Ice cold
  penaltyTraitLose: 0.3, // Cursed
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §16 BETWEEN-SEASON PROGRESSION
// ─────────────────────────────────────────────────────────────────────────────

export const CHANGES = {
  /** Club size change: outcomes [+2,+1,0,−1,−2], slow (S) and normal (N) columns. */
  clubSize: {
    outcomes: [2, 1, 0, -1, -2],
    slow: [0.05, 0.1, 0.7, 0.1, 0.05],
    normal: [0.1, 0.2, 0.4, 0.2, 0.1],
  },
  /** Club organisation change: outcomes [−3..+3] by ownership type. */
  clubOrg: {
    outcomes: [-3, -2, -1, 0, 1, 2, 3],
    capitalistic: [0.05, 0.15, 0.2, 0.2, 0.2, 0.15, 0.05],
    fans: [0.01, 0.09, 0.2, 0.4, 0.2, 0.09, 0.01],
  },
  /**
   * Team stat change (Att/Def/Sta), one roll per stat. Outcomes [−3..+3] indexed
   * by ownership then club organisation 1..9. "Slow" halves & rounds up (SLOW_MAP).
   */
  statOutcomes: [-3, -2, -1, 0, 1, 2, 3],
  statCapitalistic: {
    9: [0, 0.1, 0.15, 0.25, 0.25, 0.2, 0.05],
    8: [0, 0.1, 0.15, 0.25, 0.25, 0.2, 0.05],
    7: [0, 0.1, 0.2, 0.25, 0.25, 0.15, 0.05],
    6: [0, 0.1, 0.2, 0.25, 0.25, 0.15, 0.05],
    5: [0, 0.1, 0.25, 0.3, 0.25, 0.1, 0],
    4: [0.05, 0.15, 0.25, 0.25, 0.2, 0.1, 0],
    3: [0.05, 0.15, 0.25, 0.25, 0.2, 0.1, 0],
    2: [0.05, 0.2, 0.25, 0.25, 0.15, 0.1, 0],
    1: [0.05, 0.2, 0.25, 0.25, 0.15, 0.1, 0],
  } as Record<number, number[]>,
  statFans: {
    9: [0, 0.1, 0.15, 0.3, 0.25, 0.15, 0.05],
    8: [0, 0.1, 0.15, 0.35, 0.2, 0.15, 0.05],
    7: [0, 0.1, 0.2, 0.35, 0.2, 0.15, 0],
    6: [0, 0.1, 0.2, 0.4, 0.2, 0.1, 0],
    5: [0, 0.1, 0.2, 0.4, 0.2, 0.1, 0],
    4: [0, 0.1, 0.2, 0.4, 0.2, 0.1, 0],
    3: [0, 0.15, 0.2, 0.35, 0.2, 0.1, 0],
    2: [0.05, 0.15, 0.2, 0.35, 0.15, 0.1, 0],
    1: [0.05, 0.15, 0.25, 0.3, 0.15, 0.1, 0],
  } as Record<number, number[]>,
  /** Slow variant: half the magnitude, rounded up (away from zero). */
  slowMap: { "-3": -2, "-2": -1, "-1": -1, "0": 0, "1": 1, "2": 1, "3": 2 } as Record<string, number>,
  /** Ownership change chance: [standardYes, frequentYes]. */
  ownership: { standard: 0.01, frequent: 0.05 },
  /** Coach change chance by years-in-post (Y1..Y6, then Y6 repeats). */
  coachChange: {
    noRelNoTitle: [0.1, 0.2, 0.4, 0.6, 0.7, 0.8],
    championPromoted: [0.05, 0.15, 0.4, 0.5, 0.6, 0.7],
    relegated: [0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
  },
  /** Form change per match: buckets and [Normal, CoachPositive, CoachNegative]. */
  form: {
    buckets: [
      { min: -0.1, max: -0.06 },
      { min: -0.05, max: -0.01 },
      { min: 0, max: 0 },
      { min: 0.01, max: 0.05 },
      { min: 0.06, max: 0.1 },
    ],
    normal: [0.15, 0.2, 0.3, 0.2, 0.15],
    coachPositive: [0.1, 0.15, 0.3, 0.25, 0.2],
    coachNegative: [0.2, 0.25, 0.3, 0.15, 0.1],
    max: 2,
    min: -2,
    seasonStartRange: 0.5, // random +0.5..−0.5 at season start
    step: 0.01,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §17 CORRUPTION
// ─────────────────────────────────────────────────────────────────────────────

export const CORRUPTION = {
  catchRate: { low: 0.01, medium: 0.05, high: 0.15 },
  defaultSpan: { min: -12, max: -3 },
  corruptibleTraitBonus: 0.2,
  reasons: [
    "Match-fixing",
    "False accounting",
    "Insolvency and administration",
    "Wage delays",
    "Bribing referees",
    "Bribing official clerks",
    "Third-party ownership",
    "Fielding ineligible players",
    "Bringing the game into disrepute",
    "Tax evasion",
    "Not paying transfer fees",
    "Falsified player information",
    "Spied on competitors",
    "Hacked competitors",
    "Bought players that were too young",
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// §18 VIOLENT / DISRUPTIVE CROWD
// ─────────────────────────────────────────────────────────────────────────────

export const CROWD = {
  /** Incident risk per game, indexed by club size 1..9 then organisation 1..9. */
  riskBySizeOrg: {
    9: { 9: 0, 8: 0, 7: 0, 6: 0.01, 5: 0.01, 4: 0.03, 3: 0.03, 2: 0.03, 1: 0.05 },
    8: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0.01, 4: 0.01, 3: 0.03, 2: 0.03, 1: 0.03 },
    7: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0.01, 3: 0.01, 2: 0.03, 1: 0.03 },
    6: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0.01, 2: 0.01, 1: 0.03 },
    5: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0.01, 1: 0.01 },
    4: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0.01 },
    3: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    2: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    1: { 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  } as Record<number, Record<number, number>>,
  /** On an incident, chance the team is actually punished with a 0–3 loss. */
  punishmentChance: 0.5,
  forfeitLossRange: { min: 0, max: 3 },
  reasons: [
    "Violence between crowds in the stands",
    "Crowd invaded the pitch",
    "Crowd threw a pig's head on the pitch",
    "Crowd threw a moped on the pitch",
    "Police intervened in the stands",
    "Fire in the stands",
    "Game called off (unsafe)",
    "Players fighting fans",
    "Barricades failed",
    "Bangers thrown onto the pitch",
    "Crowd destroying the stands",
    "Police stand-off",
    "Activists handcuffed to a goalpost",
    "Smoke bombs",
    "Racist chanting",
    "Players fighting",
    "Owner attacks officials",
    "Bomb scare",
    "Streaker",
    "Power outage",
  ],
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LEAGUE RULE DEFAULTS (§7)
// ─────────────────────────────────────────────────────────────────────────────

export const TIE_BREAKS = ["goalDiff", "goalsScored", "headToHead", "coinToss"] as const;
export type TieBreak = (typeof TIE_BREAKS)[number];

export const DEFAULT_RULES = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tieBreakOrder: ["goalDiff", "goalsScored", "headToHead", "coinToss"] as TieBreak[],
  homeAdvantage: true,
  corruption: false,
  bigTeamAdvantage: false,
  weather: false,
  motivation: false,
  crowdTrouble: false,
  mirroring: false,
  derby: false,
  derbyRange: 0, // grid cells apart still counting as a derby
  form: false,
  climate: "temperate" as "warm" | "temperate" | "cold",
  motivationGamesFromEnd: 5,
  corruptionFrequency: "medium" as "low" | "medium" | "high",
  corruptionSpan: { min: -12, max: -3 },
  ownership: "mix" as "capitalistic" | "mix" | "fans",
  statChanges: "normal" as "normal" | "slow" | "static",
  clubSizeChanges: "smallEvery5" as
    | "static"
    | "smallEvery5"
    | "every5"
    | "smallEverySeason"
    | "everySeason",
  clubOrgChanges: "static" as "static" | "change",
} as const;

export type LeagueRules = {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  tieBreakOrder: TieBreak[];
  homeAdvantage: boolean;
  corruption: boolean;
  bigTeamAdvantage: boolean;
  weather: boolean;
  motivation: boolean;
  crowdTrouble: boolean;
  mirroring: boolean;
  derby: boolean;
  derbyRange: number;
  form: boolean;
  climate: "warm" | "temperate" | "cold";
  motivationGamesFromEnd: number;
  corruptionFrequency: "low" | "medium" | "high";
  corruptionSpan: { min: number; max: number };
  ownership: "capitalistic" | "mix" | "fans";
  statChanges: "normal" | "slow" | "static";
  clubSizeChanges:
    | "static"
    | "smallEvery5"
    | "every5"
    | "smallEverySeason"
    | "everySeason";
  clubOrgChanges: "static" | "change";
};

export function defaultRules(): LeagueRules {
  return {
    ...DEFAULT_RULES,
    tieBreakOrder: [...DEFAULT_RULES.tieBreakOrder],
    corruptionSpan: { ...DEFAULT_RULES.corruptionSpan },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// JERSEY PATTERNS (§5)
// ─────────────────────────────────────────────────────────────────────────────

export const JERSEY_PATTERNS = [
  "One color",
  "Shirt collar diff color",
  "Lateral colors",
  "Stripes",
  "Thin stripes",
  "Thick stripes",
  "Horizontal lines 1",
  "Horizontal lines 3",
  "Shoulder sleeves",
  "2 colors horizontal 50%",
  "2 colors horizontal 75%",
  "2 colors vertical 50%",
  "2 colors vertical 75%",
  "1 diagonal line left/right",
  "1 diagonal line right/left",
  "Arlequin",
  "Vertical centre line",
  "Cross",
] as const;
export type JerseyPattern = (typeof JERSEY_PATTERNS)[number];

// Grid bounds for the location map (§11): X and Y each −10..+10 (no 0).
export const GRID = { min: -10, max: 10 } as const;
