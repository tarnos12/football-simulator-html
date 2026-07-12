/**
 * league/geographic.ts — distribute teams across same-level divisions (§6).
 *
 * "Random" shuffles the pool; "geographic" uses the location grid — e.g. a
 * Div-2 North/South split gives the northernmost teams to the first division.
 */

import { RNG } from "../core/rng";
import type { Team } from "../model/types";

/** Split `teamIds` into groups of the given sizes, randomly. */
export function distributeRandom(
  rng: RNG,
  teamIds: readonly string[],
  sizes: readonly number[],
): string[][] {
  const pool = rng.shuffle([...teamIds]);
  return chunk(pool, sizes);
}

/**
 * Geographic split: order teams north→south (then west→east) and slice by size,
 * so the first division gets the northernmost teams (§6 worked example).
 */
export function distributeGeographic(
  teamIds: readonly string[],
  teams: Record<string, Team>,
  sizes: readonly number[],
): string[][] {
  const ordered = [...teamIds].sort((a, b) => {
    const ta = teams[a].location;
    const tb = teams[b].location;
    if (tb.y !== ta.y) return tb.y - ta.y; // higher Y = more north, first
    return ta.x - tb.x; // then west→east
  });
  return chunk(ordered, sizes);
}

function chunk(items: readonly string[], sizes: readonly number[]): string[][] {
  const out: string[][] = [];
  let i = 0;
  for (const size of sizes) {
    out.push(items.slice(i, i + size));
    i += size;
  }
  // Any leftover (rounding) joins the last group.
  if (i < items.length && out.length) out[out.length - 1].push(...items.slice(i));
  return out;
}
