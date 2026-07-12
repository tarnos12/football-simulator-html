/**
 * game/campaign.ts — the multi-season campaign orchestrator (§4, §16). Framework-
 * agnostic; the React UI wraps it. Ties together season simulation with flavour,
 * cups, statistics history, and the between-season progression + promotion loop.
 *
 * The league is intentionally mutable (form evolves through a season); progression
 * and promotion produce new league clones between seasons.
 */

import { RNG } from "../core/rng";
import type { CupConfig, LeagueSystem } from "../model/types";
import {
  createSeason,
  simulateMatch,
  simulateSystemRound,
  simulateWholeSeason,
  refreshDivisionTable,
  advancePhases,
  isSeasonComplete,
  applyPromotionRelegation,
  seasonSummary,
  type SeasonState,
  type SimHooks,
} from "../league";
import { createCup, playNextCupRound, type CupState } from "../league/cup";
import { flavourHooks, seasonOutcomes } from "../systems/flavour";
import { computeCorruption } from "../systems/corruption";
import { applyBetweenSeason, type ChangeHighlights } from "../systems/progression";
import { archiveSeason, type SeasonArchive } from "../stats/records";

export class Campaign {
  league: LeagueSystem;
  seasonNumber = 1;
  season!: SeasonState;
  cup: CupState | null = null;
  history: SeasonArchive[] = [];
  highlights: Record<string, ChangeHighlights> = {};
  private hooks: SimHooks;

  constructor(league: LeagueSystem) {
    this.league = league;
    this.hooks = flavourHooks(league);
    this.startSeason();
  }

  /** Begin a season: corruption deductions, schedule, cup draw. */
  startSeason(): void {
    const corruption = computeCorruption(this.league, this.seasonNumber, new RNG(this.league.seed));
    this.season = createSeason(this.league, this.seasonNumber, corruption.startingPoints);
    // Attach corruption markers to the relevant divisions for display.
    for (const m of corruption.markers) {
      const ds = this.season.divisions.find((d) => d.divisionId === m.divisionId);
      ds?.markers?.push({ teamId: m.teamId, kind: "corruption", reason: m.reason, pointsLost: m.pointsLost });
    }
    this.hooks = flavourHooks(this.league);
    this.cup = this.league.cup?.enabled ? createCup(this.league, this.league.cup, this.seasonNumber) : null;
  }

  simulateNextRound(): void {
    if (!isSeasonComplete(this.season)) {
      simulateSystemRound(this.league, this.season, this.hooks);
      advancePhases(this.league, this.season); // spawn split groups if a phase just ended
    }
  }

  /** Simulate a single next match (§4): the next unplayed game of a division. */
  simulateNextMatch(divisionId?: string): void {
    const div = divisionId
      ? this.season.divisions.find((d) => d.divisionId === divisionId)
      : this.season.divisions.find((d) => d.playedRounds < d.totalRounds);
    if (!div) return;
    const next = div.schedule.find((m) => !m.result);
    if (!next) return;
    simulateMatch(this.league, this.season, div, next, this.hooks);
    refreshDivisionTable(this.league, div);
    // If this completed the division's current round, advance the round counter
    // and record position history so the round-based views stay consistent.
    const nextRound = div.playedRounds + 1;
    const roundDone = div.schedule.filter((m) => m.round === nextRound).every((m) => m.result);
    if (roundDone) {
      div.playedRounds = nextRound;
      div.table.forEach((row, i) => row.positionHistory.push(i + 1));
    }
    advancePhases(this.league, this.season); // spawn split groups if a phase just ended
    this.season.complete = isSeasonComplete(this.season);
  }

  /** Simulate the whole season, looping through any split phases. */
  simulateSeason(): void {
    let guard = 0;
    do {
      simulateWholeSeason(this.league, this.season, this.hooks);
    } while (advancePhases(this.league, this.season) > 0 && guard++ < 20);
  }

  seasonComplete(): boolean {
    return isSeasonComplete(this.season);
  }

  /** Advance the cup by one round (if a cup exists and isn't finished). */
  advanceCup(): void {
    if (this.cup && !this.cup.complete && this.league.cup) {
      playNextCupRound(this.league, this.cup, this.league.cup, this.seasonNumber);
    }
  }

  playWholeCup(): void {
    let guard = 0;
    while (this.cup && !this.cup.complete && guard++ < 100) this.advanceCup();
  }

  summary() {
    return seasonSummary(this.league, this.season);
  }

  /** Archive the finished season, apply between-season changes + pro/rel, start next. */
  advanceToNextSeason(): void {
    this.simulateSeason(); // ensures all phases (incl. splits) are complete
    this.playWholeCup();
    this.history.push(archiveSeason(this.league, this.season));

    const outcomes = seasonOutcomes(this.league, this.season);
    const progressed = applyBetweenSeason(this.league, this.seasonNumber, outcomes, new RNG(this.league.seed));
    const promoted = applyPromotionRelegation(progressed.league, this.season, new RNG(`${this.league.seed}::prorel::${this.seasonNumber}`));

    this.league = promoted.league;
    this.highlights = progressed.highlights;
    this.seasonNumber++;
    this.startSeason();
  }
}

/** Serializable snapshot of a cup config for a quick single knockout of all teams. */
export function defaultCup(league: LeagueSystem, name = "National Cup"): CupConfig {
  return {
    enabled: true,
    name,
    format: "knockout",
    teamIds: Object.keys(league.teams),
    groupSize: 4,
    advancePerGroup: 2,
    finalNeutralGround: true,
  };
}
