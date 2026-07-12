# PROJECT.md — Project-Specific Instructions

Project detail for the agent team. **For team-running rules (the 3 rules, audit protocol, readiness
gate, hygiene), see `CLAUDE.md`.** This file holds *what* is built; `CLAUDE.md` holds *how* the team
operates. Keep the split clean. Design authority is **`GDD.md`** (World of Sports), which was itself distilled
from the source workbook **`docs/source-workbook/`** (*"Sport Sim - World of Sports.xlsx"*). The
**Excel is the ultimate source of exact numbers**; the GDD is the structured reading of it. Order of
authority: **Excel → GDD → this file**. When they disagree on a *value*, the workbook wins; when the
GDD adds structure the sheet lacks, the GDD wins. Update this file to match — never silently diverge.

---

## Goal

**World of Sports** — a browser-based, god-mode fantasy football (soccer) **league simulator**. The
player is an overseer, not a manager: they design a whole league pyramid (levels, divisions, teams,
rules), optionally add cups, then simulate seasons — one match, one round, or a whole season in two
clicks — and watch an emergent story unfold. There is no win condition; it is a **creator-first
sandbox** whose payoff is the narrative the player builds around a league they authored. Systemic
flavour (weather, attendance, coaches, form, motivation, corruption, crowd trouble, randomness) adds
drama on top of a dice-and-tables match engine. League systems are **100% shareable**, so the
community can recreate real-world leagues with no licensing cost. Design authority: **`GDD.md`**.

## Stack & structure

- **Platform:** single-page browser app built with **React + TypeScript + Vite**, compiled to a
  fully static bundle. It ships over **GitHub Pages** — a GitHub Actions workflow builds
  (`vite build`) and publishes the static `dist/` to Pages, so "runs on gh-pages" holds even with a
  build step (the deployed output is plain static files, no server). Vite is configured with the
  repo `base` path for project Pages. Current state: an `index.html` landing page (served from the
  `gh-pages` branch); the simulator itself is **not yet built** — this is pre-implementation
  greenfield.
- **Why this stack (agent-team fit):** the app is UI-heavy (creation wizard, standings tables,
  editor grids, maps — §21), which React's **component-per-file** model splits cleanly into
  one-file-per-agent ownership. **TypeScript** turns the "freeze the interface contract before
  parallel work" practice (AGENT_TEAMS §12) into compiler-enforced `model/` types — teammates build
  against the same shapes and the type-checker catches contract drift.
- **Sim is framework-agnostic.** All simulation logic (`model/`, `sim/`, `systems/`, `league/`,
  `stats/`) is **pure TypeScript with no React import** — React only renders state the pure core
  produces. This keeps the engine testable headless and the determinism boundary clean.
- **Determinism:** the sim is dice-driven but must be **reproducible** — a league + seed always
  replays identically (required for sharing and for browsing back through past results). One seeded
  PRNG feeds all sim randomness; **no `Math.random` or wall-clock** time inside `sim/`, `systems/`,
  or `league/`.
- **Balance data lives in one place:** every hidden/creator-tunable table (the Goal Table §8.1,
  weather probabilities §10, attendance bases/curves §13, between-season change matrices §16,
  corruption & crowd-incident odds §17–18, coach-attribute pools §12, reason lists §17–18) lives in
  **`src/config.ts`** so it can be tuned and, where the GDD allows, edited by advanced players.
- **Proposed module → ownership map** (additive, self-contained modules; module boundary = ownership
  boundary; everything under `src/`):

  | Module | Responsibility (GDD refs) |
  |---|---|
  | `config.ts` | **All** balance constants / hidden tables — single source of truth (§8.1, §10, §13, §16–18, §23) |
  | `core/rng.ts` | Seeded PRNG; determinism helpers |
  | `model/` | TypeScript types + Team Card, league-system, season state; **serialization / share import-export** (§5, §22). Frozen interface contract for the whole team. |
  | `sim/` | Match resolution: two halves, who-has-the-day, Att-vs-Def, stamina, 2D6 + coach diff, Goal-Table lookup, overtime & penalties (§8, §9, §15). Pure TS. |
  | `systems/` | Flavour systems: weather, attendance, coaches, form, motivation, corruption, crowd incidents, between-season progression (§10, §12–13, §16–18). Pure TS. |
  | `league/` | League architecture, scheduling, phases, promotion/relegation, cups, playoffs, international (§6, §14, §15, §19). Pure TS. |
  | `stats/` | Statistics & history / records (§20). Pure TS. |
  | `ui/` | React components — one component per file: creation wizard, results, table, Team Card + Edit, Edit-Division grid, Location Map, Jersey Editor, cup screens, season summary, creator/balance tools (§21, §23) |
  | `App.tsx`, `main.tsx` | App shell, routing & wiring — **lead-owned; no teammate edits these** |
  | `*.test.ts` (Vitest), `e2e/` (Playwright) | Unit/determinism tests and browser e2e (Test Author owns) |
  | `.github/workflows/deploy.yml` | Actions build + Pages deploy (lead/infra-owned) |

## Hard constraints (enforce on every teammate)

- **GDD/Excel numbers are LAW — no balance changes.** Every table, probability, threshold, and
  formula is transcribed **verbatim** from `GDD.md` (and, where it is the authority, the source
  workbook *"Sport Sim - World of Sports.xlsx"*). Teammates do **not** invent, round, "improve," or
  rebalance any number. The **only** permitted deviation is a value that is **provably wrong/internally
  inconsistent** in the source — and then the fix is surfaced to the lead + author, recorded in a
  `docs/GDD-discrepancies.md` note, and applied only after the author confirms. `[OPEN]` items in the
  GDD are raised to the author, not decided unilaterally.
- **`config.ts` is the single home for all balance tables/constants.** Only its designated owner
  writes it; everyone else requests a change. No stat table, probability, or reason list is defined
  anywhere else.
- **Deterministic sim.** One seeded PRNG; **no `Math.random` and no wall-clock** anywhere in
  `sim/`, `systems/`, or `league/`. Same league + same seed ⇒ byte-identical season.
- **100% shareable state.** Everything defining a league system (teams, stats, rules, cups,
  locations, jerseys) must round-trip through `model/` serialization with no loss and no external
  assets or licensed data. Serialize → deserialize must be identical.
- **Players never see raw numbers.** In player-facing screens, stats/form/weather show as
  icons/arrows/mini-jerseys/tooltips (plain-language, not numbers). Raw numbers appear **only** in
  creator/edit tools (§3, §5, §21).
- **All hidden tables stay creator-editable.** The Goal Table and every tuning table must remain
  reachable and editable from creator/balance tools (§23) — do not hard-inline them beyond
  `config.ts`. (Player-side edits are a runtime override; the committed defaults stay the GDD
  values.)
- **Module = ownership boundary.** No two teammates edit the same file; the only shared read
  surfaces are `config.ts` (owner-written, everyone reads the contracted keys) and `model/` public
  interfaces. Interface changes route through the lead.

---

## Instantiated roster (map `CLAUDE.md` archetypes → this project)

Spawn only the **3–5** the current phase needs. *(subagent)* roles are spawned by the relevant
teammate. Name teammates `[Role]-[Model]-[Task]` and set each model explicitly at spawn.

| Role | Model | Owns / does |
|---|---|---|
| **Lead / Integrator & Architect** | Opus | Module interfaces, sequencing, `main.js` wiring, integration passes, merges, go/no-go |
| **Match-Engine Dev** | Opus | `sim/` — the hardest subsystem: two-half resolution, modifiers, Goal-Table lookup, overtime & penalties |
| **League & Competition Dev** | Sonnet | `league/` — architecture, scheduling (home/away + mirroring), phases, promotion/relegation, cups, playoffs, international |
| **Systems / Flavour Dev** | Sonnet | `systems/` — weather, attendance, coaches, form, motivation, corruption, crowd incidents, between-season progression |
| **UI / UX Dev** | Sonnet | `ui/` — creation wizard, results & table tabs, Team Card/Edit, Edit-Division grid, Location Map, Jersey Editor, cup & summary screens, creator tools |
| **Shared-Standard / Balance Owner** | Fable | **Sole writer of `config.ts`** — all hidden tables & tuning; adjudicates balance feel |
| **Test Author** | Sonnet | Vitest unit + determinism suites (`*.test.ts`) and Playwright e2e (`e2e/`) |
| **QA / Verification** | Opus | The adversary — runs both suites, hunts failures, verifies fixes, gates each milestone against the GDD |
| **Content / Asset Pipeline** *(subagent)* | Haiku | Reason lists (corruption/crowd), jersey palettes/patterns, data tables, mechanical plumbing |

**Shared-file owner:** only the **Balance Owner** writes `config.ts`; everyone else requests changes.
`main.js` is **lead-only**; `model/` public interfaces are frozen in a contract before parallel work.

---

## Milestone exit criteria (QA gates each before it's "done")

- **Phase 1 — Foundation (model, config, RNG, sharing):** Team Card and league-system data model
  exist; `config.ts` holds the Goal Table and core constants; seeded PRNG is deterministic; a league
  system serializes → deserializes **byte-identical**. *Gate:* build a league in memory, round-trip
  it losslessly, and confirm same seed ⇒ same random stream.
- **Phase 2 — Match engine:** single match resolves per §8 — who-has-the-day, Att-vs-Def + stamina
  each half, all applicable modifiers, 2D6 + coach-skill diff, Goal-Table lookup — producing a
  `Full (HT)` score. *Gate:* a match is fully **reproducible from its seed**, the GDD worked example
  reproduces, and no `Math.random`/wall-clock exists in `sim/`.
- **Phase 3 — League play:** create a league (levels/divisions/teams, random or geographic split),
  schedule with home/away alternation and optional mirroring, simulate one match / one round / a
  whole season in two clicks; standings compute with the configured points and tie-break order;
  promotion/relegation and multi-phase splits resolve. *Gate:* a full season simulates end-to-end
  with a correct table and correct pro/rel, browsable round-by-round.
- **Phase 4 — Systemic flavour:** weather generation + gameplay/attendance effects, attendance,
  coaches & attributes, form, motivation, home/big-team/derby modifiers, corruption, and crowd
  incidents all wired in and toggle-gated per §7. *Gate:* each toggle demonstrably (and
  deterministically) changes outcomes; flavour markers/tooltips render on results and tables with no
  raw numbers leaked to players.
- **Phase 5 — Seasons, cups & full UI:** between-season progression (stat/size/org/ownership/coach
  changes with change highlights), cups & knockouts, playoffs/overtime/penalties, statistics &
  history, international competitions, all UI screens navigable, creator/balance tools editable, and
  league export/import sharing. *Gate:* a **multi-season loop** runs with records tracked, a league
  system exports and re-imports intact, every screen in §21 is reachable, and **both** the Vitest
  unit/determinism suite and the Playwright e2e suite pass green.

---

*Distilled once from `GDD.md` per `CLAUDE.md`. Treat this committed file as the source of truth and
edit it in place only when the author asks; it is not regenerated each session.*
