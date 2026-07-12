/**
 * systems/form.ts — form change after every match (§16). Mutates team.form,
 * clamped to [−2, +2]. The coach's form traits pick which distribution column
 * applies (Always fine-tuning → positive, Whatever will be → negative).
 */

import { RNG } from "../core/rng";
import { CHANGES } from "../config";
import type { Coach, Team } from "../model/types";
import { roundForm } from "../model/factory";

function formColumn(coach: Coach): readonly number[] {
  const up = coach.attributes.includes("formUp");
  const down = coach.attributes.includes("formDown");
  if (up && !down) return CHANGES.form.coachPositive;
  if (down && !up) return CHANGES.form.coachNegative;
  return CHANGES.form.normal;
}

/** Roll a single form delta for a coach's distribution. */
export function rollFormDelta(coach: Coach, rng: RNG): number {
  const bucketIdx = rng.weightedIndex(formColumn(coach));
  const bucket = CHANGES.form.buckets[bucketIdx];
  if (bucket.min === 0 && bucket.max === 0) return 0;
  // Uniform within the bucket on the 0.01 grid.
  const steps = Math.round((bucket.max - bucket.min) / CHANGES.form.step);
  const delta = bucket.min + rng.int(0, steps) * CHANGES.form.step;
  return roundForm(delta);
}

/** Apply a post-match form change in place; returns the new form value. */
export function updateForm(team: Team, rng: RNG): number {
  const delta = rollFormDelta(team.coach, rng);
  team.form = roundForm(Math.max(CHANGES.form.min, Math.min(CHANGES.form.max, team.form + delta)));
  return team.form;
}

/** Reset form to the season-start random value (+0.5…−0.5, §5). */
export function resetSeasonForm(team: Team, rng: RNG): void {
  team.form = roundForm((rng.next() - 0.5) * (CHANGES.form.seasonStartRange * 2));
}
