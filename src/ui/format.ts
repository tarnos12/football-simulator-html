/**
 * ui/format.ts — small presentation helpers. Players never see raw stat numbers;
 * form shows as arrows, weather as icons + plain-language tooltips (§2, §7).
 */

import { WEATHER_ICON, WEATHER_LABEL, WEATHER_GAMEPLAY_TEXT, type WeatherKind } from "../config";
import type { MatchResult } from "../model/types";

export function scoreText(r: MatchResult): string {
  return `${r.homeGoals}–${r.awayGoals} (${r.halftimeHome}–${r.halftimeAway})`;
}

export function weatherIcon(w: WeatherKind): string {
  return WEATHER_ICON[w];
}
export function weatherTooltip(w: WeatherKind): string {
  return `${WEATHER_LABEL[w]} — ${WEATHER_GAMEPLAY_TEXT[w]}`;
}

/** Form shown as arrows, never a number (§5). */
export function formArrows(form: number): string {
  if (form >= 1.0) return "⏫";
  if (form > 0.15) return "🔼";
  if (form < -1.0) return "⏬";
  if (form < -0.15) return "🔽";
  return "▪️";
}

export function numberFmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function changeArrow(delta: number | undefined): string {
  if (!delta) return "";
  return delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`;
}
