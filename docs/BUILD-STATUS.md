# Build Status — World of Sports

Live status of the phased build so any session can resume cold. Updated in the
**same commit** as the code it describes.

## Current state

| Phase | Status | Branch | Merged to main |
|---|---|---|---|
| 1 — Foundation (model, config, RNG, sharing, CI) | ✅ Done | `Phase-1` | pending |
| 2 — Match engine (`sim/`) | ⏳ Next | `Phase-2` | — |
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

## Discrepancies logged

See `docs/GDD-discrepancies.md` — #1 home advantage (Att/Def only, matches worked
example), #2 snow stamina cap (default off), #3 very-warm removes H1 stamina halving.
