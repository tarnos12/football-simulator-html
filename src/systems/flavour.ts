/**
 * systems/flavour.ts — wire the flavour systems into the season simulator.
 *
 * Produces the SimHooks the league season loop calls: a pre-match `context`
 * (weather, derby, motivation) and a post-match `afterMatch` (attendance, crowd
 * incidents, form). Also exposes helpers for season-start corruption and mapping
 * season outcomes for between-season progression.
 */

import type { LeagueRules } from "../config";
import type { Division, LeagueSystem } from "../model/types";
import type { SimHooks } from "../league/season";
import type { DivisionSeason, SeasonState } from "../league/types";
import { seasonSummary } from "../league/summary";
import { weatherGridForRound, weatherAt, type WeatherGrid } from "./weather";
import { isDerby } from "./derby";
import { motivatedTeams } from "./motivation";
import { computeAttendance } from "./attendance";
import { applyCrowdIncidents } from "./crowd";
import { updateForm } from "./form";
import type { SeasonOutcome } from "./progression";

function rulesFor(league: LeagueSystem, div: Division): LeagueRules {
  return { ...league.rules, ...(div.rulesOverride ?? {}) };
}
function divModel(league: LeagueSystem, divisionId: string): Division {
  return league.levels.flatMap((l) => l.divisions).find((d) => d.id === divisionId)!;
}

/** Build the flavour SimHooks for a league season. */
export function flavourHooks(league: LeagueSystem): SimHooks {
  const gridCache = new Map<string, WeatherGrid>();
  const gridFor = (season: number, round: number): WeatherGrid => {
    const key = `${season}:${round}`;
    let g = gridCache.get(key);
    if (!g) {
      g = weatherGridForRound(league, season, round);
      gridCache.set(key, g);
    }
    return g;
  };

  return {
    context: (homeId, awayId, div: DivisionSeason, season: SeasonState, lg: LeagueSystem) => {
      const model = divModel(lg, div.divisionId);
      const rules = rulesFor(lg, model);
      const home = lg.teams[homeId];
      const away = lg.teams[awayId];
      const round = div.playedRounds + 1;

      // Weather is always generated & shown; its gameplay effect is gated inside
      // the match engine by rules.weather (off ⇒ display only, no effect).
      const weather = weatherAt(gridFor(season.seasonNumber, round), home.location);

      const derby = !!(rules.derby && isDerby(home.location, away.location, rules.derbyRange));

      let homeMotivated = false;
      let awayMotivated = false;
      if (rules.motivation) {
        const set = motivatedTeams(div, model, rules);
        homeMotivated = set.has(homeId);
        awayMotivated = set.has(awayId);
      }
      return { weather, derby, homeMotivated, awayMotivated };
    },

    afterMatch: (result, _div, _season, lg, rng) => {
      const home = lg.teams[result.homeId];
      const away = lg.teams[result.awayId];
      const model = divModel(lg, _div.divisionId);
      const rules = rulesFor(lg, model);

      result.attendance = computeAttendance(
        home,
        away,
        { weather: result.weather, weatherEnabled: rules.weather, derby: result.derby },
        rng,
      );
      applyCrowdIncidents(result, home, away, rules, rng);
      if (rules.form) {
        updateForm(home, rng);
        updateForm(away, rng);
      }
    },
  };
}

/** Map each team's season result to its between-season coach-change situation. */
export function seasonOutcomes(league: LeagueSystem, season: SeasonState): Record<string, SeasonOutcome> {
  const outcomes: Record<string, SeasonOutcome> = {};
  const summary = seasonSummary(league, season);
  for (const div of summary.divisions) {
    if (div.championId) outcomes[div.championId] = "championPromoted";
    for (const t of div.promoted) outcomes[t] = "championPromoted";
    for (const t of div.relegated) outcomes[t] = "relegated";
  }
  for (const id of Object.keys(league.teams)) outcomes[id] ??= "none";
  return outcomes;
}
