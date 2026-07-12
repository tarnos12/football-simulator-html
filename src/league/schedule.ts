/**
 * league/schedule.ts — fixture generation (§6). Pure and deterministic.
 *
 * A single round-robin uses the circle method (each pair meets once), with home/
 * away alternated as evenly as the method allows. Extra legs swap venues; the
 * mirroring toggle makes the second half a reverse-mirror of the first (§6).
 */

import type { ScheduledMatch } from "../model/types";

/** One round-robin as rounds of [home, away] pairs (circle method). */
export function singleRoundRobin(teamIds: readonly string[]): [string, string][][] {
  const teams = [...teamIds];
  const bye = "__BYE__";
  if (teams.length % 2 === 1) teams.push(bye);
  const n = teams.length;
  const rounds: [string, string][][] = [];
  const fixed = teams[0];
  let rotating = teams.slice(1);

  for (let r = 0; r < n - 1; r++) {
    const arrangement = [fixed, ...rotating];
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = arrangement[i];
      const b = arrangement[n - 1 - i];
      if (a === bye || b === bye) continue;
      // Alternate home/away by round parity and slot to balance venues.
      const homeFirst = (r + i) % 2 === 0;
      pairs.push(homeFirst ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    // Rotate all but the fixed team.
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, rotating.length - 1)];
  }
  return rounds;
}

/**
 * Full schedule for a division: `matchesPerPairing` legs, venues swapped each
 * leg. With `mirroring`, the return leg replays the first leg's rounds in reverse
 * order (venues swapped), so mid-season a pairing repeats then unwinds (§6).
 */
export function generateSchedule(
  teamIds: readonly string[],
  matchesPerPairing: number,
  mirroring: boolean,
): ScheduledMatch[] {
  const base = singleRoundRobin(teamIds);
  const matches: ScheduledMatch[] = [];
  let roundNo = 0;

  for (let leg = 0; leg < matchesPerPairing; leg++) {
    const swap = leg % 2 === 1; // alternate venues each leg
    let legRounds = base.map((round) =>
      round.map(([h, a]) => (swap ? [a, h] : [h, a]) as [string, string]),
    );
    // Mirroring: odd legs replay in reverse round order.
    if (mirroring && swap) legRounds = [...legRounds].reverse();

    for (const round of legRounds) {
      roundNo++;
      for (const [home, away] of round) {
        matches.push({ round: roundNo, homeId: home, awayId: away });
      }
    }
  }
  return matches;
}

/** Total number of rounds a schedule spans. */
export function roundCount(schedule: readonly ScheduledMatch[]): number {
  return schedule.reduce((m, s) => Math.max(m, s.round), 0);
}

/** Group a schedule into rounds (1-indexed). */
export function matchesByRound(schedule: readonly ScheduledMatch[]): ScheduledMatch[][] {
  const rounds: ScheduledMatch[][] = [];
  for (const m of schedule) {
    (rounds[m.round - 1] ??= []).push(m);
  }
  return rounds;
}
