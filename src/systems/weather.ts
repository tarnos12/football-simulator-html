/**
 * systems/weather.ts — weather generation on the location grid (§10). Pure.
 *
 * Each round a weather map is generated deterministically from the league seed,
 * season, and round. A match reads the condition at the home team's cell. Climate
 * gates snow / very-warm. Generation percentages live in config (tunable).
 */

import { RNG } from "../core/rng";
import { GRID, WEATHER, WeatherKind } from "../config";
import type { LeagueSystem, Location } from "../model/types";

export type WeatherGrid = Map<string, WeatherKind>;

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** All valid grid cells (−10..+10 on each axis, excluding 0). */
export function allCells(): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = [];
  const min: number = GRID.min;
  const max: number = GRID.max;
  for (let x = min; x <= max; x++) {
    if (x === 0) continue;
    for (let y = min; y <= max; y++) {
      if (y === 0) continue;
      cells.push({ x, y });
    }
  }
  return cells;
}

const CELLS = allCells();

/** Generate a full weather map for one round. */
export function generateWeatherGrid(rng: RNG, climate: "warm" | "temperate" | "cold"): WeatherGrid {
  const grid: WeatherGrid = new Map();
  const gen = WEATHER.generation;
  const climateCfg = WEATHER.climates[climate];

  const setCell = (x: number, y: number, w: WeatherKind, overwrite = true) => {
    if (x === 0 || y === 0 || x < GRID.min || x > GRID.max || y < GRID.min || y > GRID.max) return;
    const k = cellKey(x, y);
    if (!overwrite && grid.has(k)) return;
    grid.set(k, w);
  };
  const randomCell = () => rng.pick(CELLS);
  const neighbours = (x: number, y: number) => {
    const out: { x: number; y: number }[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) if (dx || dy) out.push({ x: x + dx, y: y + dy });
    return out;
  };
  const block = (cx: number, cy: number, size: number, w: WeatherKind) => {
    const half = Math.floor(size / 2);
    for (let dx = -half; dx <= half; dx++)
      for (let dy = -half; dy <= half; dy++) setCell(cx + dx, cy + dy, w);
  };

  // Heavy rain: up to three cells, each surrounded by light rain.
  const heavyProbs = [gen.heavyRain.first, gen.heavyRain.second, gen.heavyRain.third];
  for (const p of heavyProbs) {
    if (!rng.chance(p)) break;
    const c = randomCell();
    for (const n of neighbours(c.x, c.y)) setCell(n.x, n.y, "lightRain", false);
    setCell(c.x, c.y, "heavyRain");
  }

  // Light rain alone.
  if (rng.chance(gen.lightRainAlone.tenCells)) {
    for (let i = 0; i < 10; i++) {
      const c = randomCell();
      setCell(c.x, c.y, "lightRain", false);
    }
    if (rng.chance(gen.lightRainAlone.fiveMore)) {
      for (let i = 0; i < 5; i++) {
        const c = randomCell();
        setCell(c.x, c.y, "lightRain", false);
      }
    }
  }

  // Snow (temperate/cold): up to two blocks.
  if (climateCfg.snow) {
    if (rng.chance(gen.snow.firstBlock)) {
      const c = randomCell();
      block(c.x, c.y, gen.snow.blockSize, "snowing");
      if (rng.chance(gen.snow.secondBlock)) {
        const c2 = randomCell();
        block(c2.x, c2.y, gen.snow.blockSize, "snowing");
      }
    }
  }

  // Very warm (warm/temperate): block with sunny surround, up to two.
  if (climateCfg.veryWarm) {
    if (rng.chance(gen.veryWarm.firstBlock)) {
      const c = randomCell();
      for (const n of neighbours(c.x, c.y)) setCell(n.x, n.y, "sunny", false);
      block(c.x, c.y, gen.veryWarm.blockSize, "veryWarm");
      if (rng.chance(gen.veryWarm.secondBlock)) {
        const c2 = randomCell();
        block(c2.x, c2.y, gen.veryWarm.blockSize, "veryWarm");
      }
    }
  }

  // Muddy cells.
  for (let i = 0; i < gen.muddyCells; i++) {
    const c = randomCell();
    setCell(c.x, c.y, "muddy", false);
  }

  // Windy: three independent checks.
  for (const p of gen.windy) {
    if (!rng.chance(p)) continue;
    for (let i = 0; i < gen.windyCellsPerCheck; i++) {
      const c = randomCell();
      setCell(c.x, c.y, "windy", false);
    }
  }

  // Fill remaining empty cells: ⅓ sunny / ⅓ light overcast / ⅓ heavy overcast.
  for (const c of CELLS) {
    if (grid.has(cellKey(c.x, c.y))) continue;
    const r = rng.next();
    const w: WeatherKind = r < 1 / 3 ? "sunny" : r < 2 / 3 ? "lightOvercast" : "heavyOvercast";
    grid.set(cellKey(c.x, c.y), w);
  }

  return grid;
}

export function weatherAt(grid: WeatherGrid, loc: Location): WeatherKind {
  return grid.get(cellKey(loc.x, loc.y)) ?? "sunny";
}

/** Deterministic weather grid for a given round of a season. */
export function weatherGridForRound(league: LeagueSystem, season: number, round: number): WeatherGrid {
  const rng = new RNG(`${league.seed}::weather::s${season}::r${round}`);
  return generateWeatherGrid(rng, league.rules.climate);
}
