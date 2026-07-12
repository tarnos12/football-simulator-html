/**
 * sim/match.ts — the core match engine (§8–9). Pure, deterministic TypeScript.
 *
 * A match is two halves. Each half, for each team, we compute an effective
 * "result" = own Attack − opponent Defence + stamina share + form share, after
 * all §9 modifiers, then roll 2D6 (+ the better coach's skill difference) and read
 * goals from the Goal Table (§8.1). Final score = Half 1 + Half 2.
 *
 * This module reproduces the workbook's worked example `4–1 (1–0)` exactly (see
 * match.test.ts). The ONLY randomness is the injected RNG — no Math.random, no
 * wall-clock — so a match replays identically from its seed.
 *
 * Random draw order (important for determinism): whoHasTheDay(home), whoHasTheDay
 * (away), then per half: home 2D6, away 2D6.
 */

import { RNG } from "../core/rng";
import {
  MATCH,
  WEATHER,
  WeatherKind,
  goalTableLookup,
  type LeagueRules,
} from "../config";
import type { CoachAttributeId } from "../config";
import type { Coach, HalfDetail, MatchResult, Team } from "../model/types";

export interface MatchContext {
  rules: LeagueRules;
  weather: WeatherKind;
  /** Neutral ground removes home advantage (finals, some deciders). */
  neutralGround?: boolean;
  /** Derby halves the Att/Def/Sta difference between the two teams (§9). */
  derby?: boolean;
  homeMotivated?: boolean;
  awayMotivated?: boolean;
}

interface StatMods {
  att: number;
  def: number;
  sta: number;
  whoDay: number; // coach adjustment to the who-has-the-day roll
}

/** Coach attribute stat modifiers (§12). */
function coachStatMods(coach: Coach): StatMods {
  const has = (id: CoachAttributeId) => coach.attributes.includes(id);
  return {
    att: (has("attackUp") ? 1 : 0) + (has("attackDown") ? -1 : 0),
    def: (has("defenceUp") ? 1 : 0) + (has("defenceDown") ? -1 : 0),
    sta: (has("staminaUp") ? 1 : 0) + (has("staminaDown") ? -1 : 0),
    whoDay: (has("whoHasDayUp") ? 1 : 0) + (has("whoHasDayDown") ? -1 : 0),
  };
}

/** Effective coach skill including assistant / "I know the best" traits. */
export function effectiveCoachSkill(coach: Coach): number {
  const has = (id: CoachAttributeId) => coach.attributes.includes(id);
  return coach.skill + (has("assistant") ? 1 : 0) + (has("iKnowBest") ? -1 : 0);
}

/** Round toward the nearest integer, half away from zero (symmetric for ±). */
function roundHalfAwayFromZero(x: number): number {
  return Math.sign(x) * Math.round(Math.abs(x));
}

/** Truncate toward zero — the workbook's "halved, rounded down" for stamina/derby. */
function halveTowardZero(x: number): number {
  return Math.trunc(x / 2);
}

/** Apply the derby halving to a pair of stats, shrinking the gap by half (§9). */
function derbyPair(home: number, away: number): [number, number] {
  const diff = home - away;
  const halved = halveTowardZero(Math.abs(diff));
  if (diff >= 0) return [away + halved, away];
  return [home, home + halved];
}

interface EffTeam {
  att: number;
  def: number;
  sta: number;
  form: number;
  coachSkill: number;
}

/**
 * Build a team's baseline effective stats for the whole match: base stats
 * (heavy-rain capped), derby halving, coach attribute mods, and the constant
 * per-match bonuses (who-has-the-day, home advantage, big-team, motivation).
 * Per-half stamina halving and windy are applied later.
 */
function buildEffectiveTeams(
  home: Team,
  away: Team,
  ctx: MatchContext,
  whoDayHomeNet: number,
  whoDayAwayNet: number,
): { home: EffTeam; away: EffTeam } {
  const { rules } = ctx;

  // Base stats, with heavy-rain cap at 5 applied to the underlying att/def.
  const rainCap = rules.weather && ctx.weather === "heavyRain";
  let hAtt = rainCap ? Math.min(home.attack, WEATHER.effects.heavyRain.attDefCap) : home.attack;
  let hDef = rainCap ? Math.min(home.defence, WEATHER.effects.heavyRain.attDefCap) : home.defence;
  let aAtt = rainCap ? Math.min(away.attack, WEATHER.effects.heavyRain.attDefCap) : away.attack;
  let aDef = rainCap ? Math.min(away.defence, WEATHER.effects.heavyRain.attDefCap) : away.defence;
  let hSta = home.stamina;
  let aSta = away.stamina;

  // Derby halves the difference of each stat (§9), before other bonuses.
  if (ctx.derby && rules.derby) {
    [hAtt, aAtt] = derbyPair(hAtt, aAtt);
    [hDef, aDef] = derbyPair(hDef, aDef);
    [hSta, aSta] = derbyPair(hSta, aSta);
  }

  // Coach attribute stat modifiers.
  const hc = coachStatMods(home.coach);
  const ac = coachStatMods(away.coach);
  hAtt += hc.att; hDef += hc.def; hSta += hc.sta;
  aAtt += ac.att; aDef += ac.def; aSta += ac.sta;

  // Who-has-the-day: net advantage adds to the winner's Att/Def/Sta.
  hAtt += whoDayHomeNet; hDef += whoDayHomeNet; hSta += whoDayHomeNet;
  aAtt += whoDayAwayNet; aDef += whoDayAwayNet; aSta += whoDayAwayNet;

  // Home advantage (Att/Def per workbook worked example — discrepancy #1).
  if (rules.homeAdvantage && !ctx.neutralGround) {
    hAtt += MATCH.homeAdvantage.att;
    hDef += MATCH.homeAdvantage.def;
    hSta += MATCH.homeAdvantage.sta;
  }

  // Big-team advantage: club-size gap ≥ threshold → bigger club +Att/+Def.
  if (rules.bigTeamAdvantage) {
    const gap = home.clubSize - away.clubSize;
    if (gap >= MATCH.bigTeam.sizeDiffThreshold) {
      hAtt += MATCH.bigTeam.att; hDef += MATCH.bigTeam.def; hSta += MATCH.bigTeam.sta;
    } else if (-gap >= MATCH.bigTeam.sizeDiffThreshold) {
      aAtt += MATCH.bigTeam.att; aDef += MATCH.bigTeam.def; aSta += MATCH.bigTeam.sta;
    }
  }

  // Motivation: +1 Att/Def/Sta to a team still in contention (+1 more if the
  // coach has "Firestarter"; negated by "Status Quo").
  if (rules.motivation) {
    if (ctx.homeMotivated) applyMotivation(home.coach, (n) => { hAtt += n; hDef += n; hSta += n; });
    if (ctx.awayMotivated) applyMotivation(away.coach, (n) => { aAtt += n; aDef += n; aSta += n; });
  }

  return {
    home: { att: hAtt, def: hDef, sta: hSta, form: home.form, coachSkill: effectiveCoachSkill(home.coach) },
    away: { att: aAtt, def: aDef, sta: aSta, form: away.form, coachSkill: effectiveCoachSkill(away.coach) },
  };
}

function applyMotivation(coach: Coach, add: (n: number) => void): void {
  if (coach.attributes.includes("motivationDown")) return; // Status Quo negates it
  const bonus = MATCH.motivation.att + (coach.attributes.includes("motivationUp") ? 1 : 0);
  add(bonus);
}

/** Resolve a single half; returns goals for both teams plus detail. */
function resolveHalf(
  eff: { home: EffTeam; away: EffTeam },
  ctx: MatchContext,
  isFirstHalf: boolean,
  rng: RNG,
): HalfDetail {
  const { home, away } = eff;

  // Stamina share: full in H2, halved (toward zero) in H1 — unless "very warm"
  // removes the first-half halving (discrepancy #3).
  const staminaDiff = home.sta - away.sta;
  const veryWarm = ctx.rules.weather && ctx.weather === "veryWarm";
  const removeHalving = veryWarm && WEATHER.effects.veryWarm.removeFirstHalfStaminaHalving;
  const share = isFirstHalf && !removeHalving ? halveTowardZero(staminaDiff) : staminaDiff;

  // Windy: +1 Att/Def to each team for one half each — symmetric, cancels in the
  // difference (kept explicit for faithfulness; net zero on the score).
  const windAtt = ctx.rules.weather && ctx.weather === "windy" ? WEATHER.effects.windy.attHalf : 0;
  const windDef = ctx.rules.weather && ctx.weather === "windy" ? WEATHER.effects.windy.defHalf : 0;

  const formOn = ctx.rules.form;
  const formShareHome = formOn ? home.form - away.form : 0;
  const formShareAway = formOn ? away.form - home.form : 0;

  const homeResultRaw =
    (home.att + windAtt) - (away.def + windDef) + share + formShareHome;
  const awayResultRaw =
    (away.att + windAtt) - (home.def + windDef) - share + formShareAway;

  const homeDiff = roundHalfAwayFromZero(homeResultRaw);
  const awayDiff = roundHalfAwayFromZero(awayResultRaw);

  // 2D6 + coach-skill difference to the better-coached side (capped at 4).
  const homeBase = rng.roll2d6();
  const awayBase = rng.roll2d6();
  const skillDiff = clamp(home.coachSkill - away.coachSkill, -MATCH.coachSkillMaxDiff, MATCH.coachSkillMaxDiff);
  const homeRoll = homeBase + Math.max(0, skillDiff);
  const awayRoll = awayBase + Math.max(0, -skillDiff);

  return {
    homeGoals: goalTableLookup(homeDiff, homeRoll),
    awayGoals: goalTableLookup(awayDiff, awayRoll),
    homeRoll,
    awayRoll,
    homeDiff,
    awayDiff,
  };
}

/** Resolve a full match into a MatchResult (score, halves, detail). */
export function resolveMatch(home: Team, away: Team, ctx: MatchContext, rng: RNG): MatchResult {
  // Who-has-the-day — one roll each, plus coach whoDay traits.
  const homeWhoDay = rng.int(MATCH.whoHasTheDay.min, MATCH.whoHasTheDay.max) + coachStatMods(home.coach).whoDay;
  const awayWhoDay = rng.int(MATCH.whoHasTheDay.min, MATCH.whoHasTheDay.max) + coachStatMods(away.coach).whoDay;
  const net = homeWhoDay - awayWhoDay;
  const whoDayHomeNet = Math.max(0, net);
  const whoDayAwayNet = Math.max(0, -net);

  const eff = buildEffectiveTeams(home, away, ctx, whoDayHomeNet, whoDayAwayNet);

  const h1 = resolveHalf(eff, ctx, true, rng);
  const h2 = resolveHalf(eff, ctx, false, rng);

  const homeGoals = h1.homeGoals + h2.homeGoals;
  const awayGoals = h1.awayGoals + h2.awayGoals;

  return {
    homeId: home.id,
    awayId: away.id,
    homeGoals,
    awayGoals,
    halftimeHome: h1.homeGoals,
    halftimeAway: h1.awayGoals,
    halves: [h1, h2],
    weather: ctx.weather,
    attendance: 0, // filled by systems/ (Phase 4)
    neutralGround: !!ctx.neutralGround,
    derby: !!ctx.derby,
    motivationHome: !!ctx.homeMotivated,
    motivationAway: !!ctx.awayMotivated,
    incidents: [],
  };
}

/** Format a score the workbook way: `Full (HT)`, e.g. `4–1 (1–0)`. */
export function formatScore(r: MatchResult): string {
  return `${r.homeGoals}–${r.awayGoals} (${r.halftimeHome}–${r.halftimeAway})`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
