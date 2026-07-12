# Build Status — World of Sports

Live status of the phased build so any session can resume cold. Updated in the
**same commit** as the code it describes.

## Current state

| Phase | Status | Branch | Merged to main |
|---|---|---|---|
| 1 — Foundation (model, config, RNG, sharing, CI) | ✅ Done | `Phase-1` | ✅ |
| 2 — Match engine (`sim/`) | ✅ Done | `Phase-2` | ✅ |
| 3 — League play (`league/`, `stats/`) | ✅ Done | `Phase-3` | ✅ |
| 4 — Systemic flavour (`systems/`) | ✅ Done | `Phase-4` | pending |
| 5 — Seasons, cups & full UI (`ui/`) | ⬜ Pending | `Phase-5` | — |

## Phase 1 — delivered

- **Toolchain:** React + TypeScript + Vite. Scripts: `dev`, `build`, `typecheck`,
  `test` (Vitest), `e2e` (Playwright). `npm ci` + `npm run build` green.
- **`src/core/rng.ts`** — seeded deterministic PRNG (xmur3 + mulberry32) with
  `int`, `d6`, `roll2d6`, `chance`, `pick`, `weightedPick`, `weightedIndex`,
  `shuffle`, `fork`, and save/restore state. **Only** source of randomness in sim.
- **`src/config.ts`** — all balance tables transcribed verbatim from the workbook:
  Goal Table (§8.1), match modifiers, weather (gameplay + attendance + generation),
  attendance base/distance/dice, coach attributes + skill/attribute distributions,
  between-season matrices (club size, org, per-org stat change ×2 ownerships,
  ownership, coach change, form), corruption, violent-crowd Size×Org matrix,
  jersey patterns, rule defaults.
- **`src/model/`** — `types.ts` (frozen contract: Team Card, league system, match
  & season runtime types), `serialize.ts` (stable-key stringify → byte-identical
  round-trip + base64 share code), `factory.ts` (deterministic team/coach/league
  construction).
- **`src/App.tsx` / `main.tsx`** — Phase 1 foundation smoke screen.
- **Tests:** 23 passing — RNG determinism, Goal-Table transcription vs worked
  example, balance-table probability sums, byte-identical serialization.
- **CI:** `.github/workflows/deploy.yml` builds `dist/` and publishes to GitHub
  Pages on push to `main`.

**Gate met:** league built in memory, round-trips losslessly (byte-identical),
same seed ⇒ same random stream. ✔

## Phase 2 — delivered

- **`src/sim/match.ts`** — full §8 two-half resolution: who-has-the-day (one roll
  each, net to winner's Att/Def/Sta), Att-vs-Def, stamina share (halved toward
  zero in H1, full in H2), all §9 modifiers (home, big-team, motivation, derby
  halving, form, weather: light-rain/heavy-rain-cap/muddy/windy/very-warm), coach
  attribute stat traits, then 2D6 + coach-skill diff (capped 4) → Goal-Table
  lookup. Produces `Full (HT)` scores.
- **`src/sim/decider.ts`** — overtime (second-half re-roll), penalties (50/50 with
  Ice-cold/Cursed traits), plausible shootout score, single-decider/aggregate
  resolution (§15).
- **Tests (12 new, 35 total):** reproduces the workbook worked example
  `4–1 (1–0)` exactly (scripted dice), same seed ⇒ identical result, batch bounds,
  neutral-ground & heavy-rain modifier effects, penalty probabilities & shootout.

**Gate met:** match reproducible from seed; GDD worked example reproduces; no
`Math.random`/wall-clock in `sim/`; unit + determinism tests green. ✔

## Phase 3 — delivered

- **`src/league/schedule.ts`** — circle-method round-robin, multi-leg (venue swap)
  + mirroring (§6); byes for odd counts.
- **`src/league/standings.ts`** — points from rules, tie-break chain (goal diff →
  goals scored → head-to-head → deterministic coin toss), home/away sub-tables.
- **`src/league/geographic.ts`** — random or geographic (latitude) division splits.
- **`src/league/season.ts`** — create season, simulate one match / one round
  (division or whole system) / whole season; deterministic per-match seeding
  (order-independent results); per-round position history.
- **`src/league/promotion.ts`** — promotion/relegation between levels, re-distributing
  each level's pool while preserving division sizes.
- **`src/league/create.ts`** — wizard blueprint → full league system.
- **`src/league/summary.ts`** — season-end champions/promoted/relegated + threshold labels.
- **`src/stats/records.ts`** — season archives, all-time table, championships,
  extremes, streaks, head-to-head (§20).
- **Tests (12 new, 47 total):** schedule integrity, standings ordering, full season
  end-to-end, determinism across granularity, pro/rel, geographic split, records.

**Gate met:** a full season simulates end-to-end with a correct table and correct
promotion/relegation, browsable round-by-round; deterministic. ✔

## Phase 4 — delivered

- **`src/systems/weather.ts`** — per-round weather grid generation (climate-gated),
  cell lookup by team location.
- **`src/systems/attendance.ts`** — §13 crowd calc; reproduces the workbook example
  (24 867).
- **`src/systems/derby.ts`**, **`motivation.ts`**, **`corruption.ts`**,
  **`crowd.ts`**, **`form.ts`**, **`progression.ts`** — derby detection, late-season
  contention, season-start corruption deductions, per-game incidents, post-match
  form change, between-season stat/size/org/ownership/coach changes + highlights.
- **`src/systems/flavour.ts`** — assembles the season `SimHooks` (pre-match context:
  weather/derby/motivation; post-match: attendance/incidents/form) and season-outcome
  mapping. `league/season.ts` gained a post-match hook seam (separate RNG stream so
  flavour never perturbs match resolution).
- **Tests (11 new, 58 total):** attendance worked example, weather determinism +
  climate gating, derby, corruption (honourable/frequency), form bounds, progression
  bounds, full flavoured season, toggle-changes-outcome, granularity determinism.

**Gate met:** each toggle deterministically changes outcomes; flavour (weather,
attendance, incidents, motivation, derby) renders in results; numbers verified vs
Excel; no raw numbers leak to players (icons/markers only). ✔

## Discrepancies logged

See `docs/GDD-discrepancies.md` — #1 home advantage (Att/Def only, matches worked
example), #2 snow stamina cap (default off), #3 very-warm removes H1 stamina halving.
