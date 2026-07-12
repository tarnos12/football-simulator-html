/**
 * systems/derby.ts — derby detection (§11). Two teams within the configured grid
 * range of each other play a derby (default 0 cells = same cell).
 */

import type { Location } from "../model/types";

/** Chebyshev (king-move) distance in grid cells. */
export function cellDistance(a: Location, b: Location): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function isDerby(a: Location, b: Location, derbyRange: number): boolean {
  return cellDistance(a, b) <= derbyRange;
}
