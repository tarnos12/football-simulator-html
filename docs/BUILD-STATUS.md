# Build Status — World of Sports

Live status of the phased build so any session can resume cold. Updated in the
**same commit** as the code it describes.

## Current state

| Phase | Status | Branch | Merged to main |
|---|---|---|---|
| 1 — Foundation (model, config, RNG, sharing, CI) | ✅ Done | `Phase-1` | ✅ |
| 2 — Match engine (`sim/`) | ✅ Done | `Phase-2` | pending |
| 3 — League play (`league/`, `stats/`) | ⬜ Pending | `Phase-3` | — |
| 4 — Systemic flavour (`systems/`) | ⬜ Pending | `Phase-4` | — |
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

## Discrepancies logged

See `docs/GDD-discrepancies.md` — #1 home advantage (Att/Def only, matches worked
example), #2 snow stamina cap (default off), #3 very-warm removes H1 stamina halving.
