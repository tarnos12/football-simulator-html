/**
 * systems/attendance.ts — cosmetic crowd figures (§13). No gameplay impact.
 *
 * Reproduces the workbook worked example (25 000 home / size-4 away 7 cells /
 * sunny / die1 odd → −11% ⇒ 24 867). Home & away base by club size, travel
 * factor, derby ×3 away, coach ±10% traits, weather %, then two dice.
 */

import { RNG } from "../core/rng";
import { ATTENDANCE, WEATHER, WeatherKind } from "../config";
import type { CoachAttributeId } from "../config";
import type { Coach, Team } from "../model/types";
import { cellDistance } from "./derby";

function travelFactor(distance: number): number {
  for (const band of ATTENDANCE.distance) {
    if (distance <= band.maxCells) return band.factor;
  }
  return 0;
}

function coachTraitPercent(homeCoach: Coach, awayCoach: Coach): number {
  const count = (id: CoachAttributeId) =>
    (homeCoach.attributes.includes(id) ? 1 : 0) + (awayCoach.attributes.includes(id) ? 1 : 0);
  const up = count("attendanceUp");
  const down = count("attendanceDown");
  return ATTENDANCE.coachTraitPercent * (up - down);
}

export interface AttendanceOptions {
  weather: WeatherKind;
  weatherEnabled: boolean;
  derby: boolean;
}

export function computeAttendance(home: Team, away: Team, opts: AttendanceOptions, rng: RNG): number {
  const homeBase = ATTENDANCE.base[home.clubSize].home;
  const awayBase = ATTENDANCE.base[away.clubSize].away;

  const distance = cellDistance(home.location, away.location);
  let awayTravel = awayBase * travelFactor(distance);
  if (opts.derby) awayTravel *= ATTENDANCE.derbyAwayMultiplier;

  const coachPct = coachTraitPercent(home.coach, away.coach);
  // Weather always affects attendance (cosmetic), even if gameplay weather is off.
  const w = WEATHER.attendance[opts.weather];
  const weatherHome = w.home;
  const weatherAway = w.away;

  const homeComponent = homeBase * (1 + coachPct + weatherHome);
  const awayComponent = awayTravel * (1 + coachPct + weatherAway);
  const base = homeComponent + awayComponent;

  // Two dice: die1 parity picks add/subtract, die2 (1–30) the percentage.
  const subtract = rng.d6() % 2 === 1;
  const pct = rng.int(1, ATTENDANCE.dice.maxPercent) / 100;
  const final = base * (subtract ? 1 - pct : 1 + pct);
  return Math.max(0, Math.round(final));
}
