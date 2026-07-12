/**
 * systems/progression.ts — between-season changes (§16). Pure.
 *
 * Applies club-size, team-stat (Att/Def/Sta), organisation, ownership, and coach
 * changes to a cloned league, returning per-team change highlights (green/red in
 * the UI). Promotion/relegation is resolved separately in `league/promotion.ts`.
 */

import { RNG } from "../core/rng";
import { CHANGES } from "../config";
import { cloneLeague } from "../model/serialize";
import { makeCoach } from "../model/factory";
import { resetSeasonForm } from "./form";
import type { LeagueSystem, Team } from "../model/types";

export type SeasonOutcome = "championPromoted" | "relegated" | "none";

export interface ChangeHighlights {
  attack?: number;
  defence?: number;
  stamina?: number;
  clubSize?: number;
  organisation?: number;
  ownership?: boolean;
  coach?: boolean;
}

const clamp19 = (v: number) => Math.max(1, Math.min(9, v));

function statDelta(team: Team, rng: RNG, mode: "normal" | "slow"): number {
  const table = team.ownership === "capitalistic" ? CHANGES.statCapitalistic : CHANGES.statFans;
  const dist = table[team.organisation];
  const raw = CHANGES.statOutcomes[rng.weightedIndex(dist)];
  return mode === "slow" ? CHANGES.slowMap[String(raw)] : raw;
}

function clubSizeMode(seasonNumber: number, rule: LeagueSystem["rules"]["clubSizeChanges"]): "normal" | "slow" | null {
  switch (rule) {
    case "static": return null;
    case "smallEvery5": return seasonNumber % 5 === 0 ? "slow" : null;
    case "every5": return seasonNumber % 5 === 0 ? "normal" : null;
    case "smallEverySeason": return "slow";
    case "everySeason": return "normal";
  }
}

export function applyBetweenSeason(
  league: LeagueSystem,
  seasonNumber: number,
  outcomes: Record<string, SeasonOutcome>,
  rng: RNG,
): { league: LeagueSystem; highlights: Record<string, ChangeHighlights> } {
  const next = cloneLeague(league);
  const highlights: Record<string, ChangeHighlights> = {};
  const rules = league.rules;

  for (const teamId of Object.keys(next.teams)) {
    const team = next.teams[teamId];
    const before = { ...team };
    const h: ChangeHighlights = {};
    // Independent per-team stream keeps ordering irrelevant.
    const r = new RNG(`${league.seed}::progress::s${seasonNumber}::${teamId}`);
    void rng;

    // Team stats (Att/Def/Sta), one roll each.
    if (rules.statChanges !== "static") {
      const mode = rules.statChanges;
      const dA = statDelta(team, r, mode);
      const dD = statDelta(team, r, mode);
      const dS = statDelta(team, r, mode);
      team.attack = clamp19(team.attack + dA);
      team.defence = clamp19(team.defence + dD);
      team.stamina = clamp19(team.stamina + dS);
      if (team.attack !== before.attack) h.attack = team.attack - before.attack;
      if (team.defence !== before.defence) h.defence = team.defence - before.defence;
      if (team.stamina !== before.stamina) h.stamina = team.stamina - before.stamina;
    }

    // Club size.
    const sizeMode = clubSizeMode(seasonNumber, rules.clubSizeChanges);
    if (sizeMode) {
      const dist = sizeMode === "slow" ? CHANGES.clubSize.slow : CHANGES.clubSize.normal;
      const delta = CHANGES.clubSize.outcomes[r.weightedIndex(dist)];
      team.clubSize = clamp19(team.clubSize + delta);
      if (team.clubSize !== before.clubSize) h.clubSize = team.clubSize - before.clubSize;
    }

    // Organisation.
    if (rules.clubOrgChanges === "change") {
      const dist = team.ownership === "capitalistic" ? CHANGES.clubOrg.capitalistic : CHANGES.clubOrg.fans;
      const delta = CHANGES.clubOrg.outcomes[r.weightedIndex(dist)];
      team.organisation = clamp19(team.organisation + delta);
      if (team.organisation !== before.organisation) h.organisation = team.organisation - before.organisation;
    }

    // Ownership (only if the league allows a mix).
    if (rules.ownership === "mix") {
      if (r.chance(CHANGES.ownership.standard)) {
        team.ownership = team.ownership === "capitalistic" ? "fans" : "capitalistic";
        h.ownership = true;
      }
    }

    // Coach change.
    const situation = outcomes[teamId] ?? "none";
    const col =
      situation === "championPromoted" ? CHANGES.coachChange.championPromoted
      : situation === "relegated" ? CHANGES.coachChange.relegated
      : CHANGES.coachChange.noRelNoTitle;
    const yearIdx = Math.min(team.coach.yearsInPost, 6) - 1;
    if (r.chance(col[yearIdx])) {
      team.coach = makeCoach(r, team.clubSize);
      h.coach = true;
    } else {
      team.coach = { ...team.coach, yearsInPost: team.coach.yearsInPost + 1 };
    }

    // Fresh season form (§5).
    resetSeasonForm(team, r);

    if (Object.keys(h).length) highlights[teamId] = h;
  }

  return { league: next, highlights };
}
