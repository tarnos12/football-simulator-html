/**
 * game/world.ts — a "world" of several league systems (countries) plus an
 * international competition between them (§19). Each country runs its own
 * campaign; the international cup draws the top teams from each and plays them
 * strength-weighted on neutral ground.
 */

import { RNG } from "../core/rng";
import { createLeague } from "../league/create";
import { combinedFinalTable } from "../league/phases";
import { playWholeInternational, type IntlEntrant, type IntlState } from "../league/international";
import { Campaign } from "./campaign";

export interface Country {
  name: string;
  strength: number; // 1–9
  campaign: Campaign;
}

const COUNTRY_NAMES = ["Nordland", "Estria", "Sudmark", "Westfold", "Kaltania", "Marenza", "Volska", "Ardenne"];

export class World {
  countries: Country[];
  international: IntlState | null = null;
  seasonNumber = 1;
  teamsPerCountry: number;
  private seed: string;

  constructor(opts: { seed: string; countryCount: number; teamsPerDivision?: number; teamsPerCountry?: number }) {
    this.seed = opts.seed;
    this.teamsPerCountry = opts.teamsPerCountry ?? 2;
    const rng = new RNG(`${opts.seed}::world`);
    this.countries = Array.from({ length: opts.countryCount }, (_, i) => {
      const name = COUNTRY_NAMES[i] ?? `Country ${i + 1}`;
      const strength = rng.int(1, 9);
      const league = createLeague(new RNG(`${opts.seed}::${name}`), {
        name: `${name} League`,
        seed: `${opts.seed}::${name}`,
        strength,
        matchesPerPairing: 2,
        levels: [{ name: "Premier", split: "random", divisions: [{ name: "Division 1", teams: opts.teamsPerDivision ?? 8 }] }],
        rules: { homeAdvantage: true, weather: true, form: true, motivation: true },
      });
      league.strength = strength;
      return { name, strength, campaign: new Campaign(league) };
    });
  }

  allSeasonsComplete(): boolean {
    return this.countries.every((c) => c.campaign.seasonComplete());
  }

  simulateAllSeasons(): void {
    for (const c of this.countries) c.campaign.simulateSeason();
  }

  /** Gather the top `teamsPerCountry` teams from each country's top division. */
  private gatherEntrants(): IntlEntrant[] {
    const entrants: IntlEntrant[] = [];
    this.countries.forEach((c, ci) => {
      const topDiv = c.campaign.league.levels[0].divisions[0];
      const table = combinedFinalTable(c.campaign.season, topDiv.id);
      const source = table.length ? table : c.campaign.season.divisions[0].table;
      for (const row of source.slice(0, this.teamsPerCountry)) {
        const id = `${ci}:${row.teamId}`;
        // Give the team a unique namespaced id so cross-league id collisions and
        // decider (overtime/penalty) winner ids resolve unambiguously.
        entrants.push({
          id,
          team: { ...c.campaign.league.teams[row.teamId], id },
          leagueName: c.name,
          strength: c.strength,
        });
      }
    });
    return entrants;
  }

  /** Run the international cup for the current season (requires seasons complete). */
  runInternational(): void {
    if (!this.allSeasonsComplete()) this.simulateAllSeasons();
    const entrants = this.gatherEntrants();
    this.international = playWholeInternational(
      "Champions Cup",
      entrants,
      `${this.seed}::s${this.seasonNumber}`,
    );
  }

  /** Look up an international entrant's display name from its namespaced id. */
  intlName(id: string): string {
    const e = this.international?.entrants[id];
    return e ? `${e.team.name} (${e.leagueName})` : id;
  }

  setStrength(countryIndex: number, strength: number): void {
    const c = this.countries[countryIndex];
    if (!c) return;
    c.strength = Math.max(1, Math.min(9, strength));
    c.campaign.league.strength = c.strength;
  }

  advanceAll(): void {
    for (const c of this.countries) c.campaign.advanceToNextSeason();
    this.international = null;
    this.seasonNumber++;
  }
}
