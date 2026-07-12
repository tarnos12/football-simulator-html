# HANDOFF — World of Sports build (for the next session)

This session did the **setup + planning**. The next session **builds the game** as an agent team,
across all 5 phases, without stopping, and merges each phase to `main`. This document is everything a
cold session needs to start. Read it, then read `PROJECT.md`, `GDD.md`, and `AGENT_TEAMS.md`.

---

## 0. TL;DR — what to do first

1. **Confirm agent teams are live.** They need `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` **at session
   start**. It is committed in `.claude/settings.json`, so a *fresh* session has it. Verify with
   `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` (should print `1`). If empty, the running session
   started before it took effect — start a new session.
2. **Branch for Phase 1:** `git checkout main && git pull && git checkout -b Phase-1`.
3. **Spawn the Phase-1 team** (roster below), build to the Phase-1 exit gate, **QA sign-off**, then
   **merge Phase-1 → main** and push.
4. Repeat for `Phase-2` … `Phase-5`. Do **not** stop between phases — deliver the fully complete game.

---

## 1. What the author asked for (hard requirements)

- **Deliver a fully complete, playable game** — all 5 phases, no stopping between them.
- **One branch per phase**, named `Phase-1`, `Phase-2`, … `Phase-5`. **Merge each into `main` when
  its phase is done** (and it's already been merged for the setup branch).
- **Clean UI.**
- **Unit testing + QA complete** before a phase is called done.
- **NO BALANCE CHANGES.** Every number comes **verbatim** from the source workbook
  (`docs/source-workbook/`); the GDD supplies the gameplay loop/structure. The only permitted number
  change is a *provable* error, logged in `docs/GDD-discrepancies.md` and confirmed by the author.

## 2. Order of authority (never diverge silently)

**Excel (`docs/source-workbook/`) → `GDD.md` → `PROJECT.md`.**
The workbook is the source of exact numbers/balancing; the GDD is the structured gameplay reading of
it; `PROJECT.md` is the team-facing plan. For a *value*, the workbook wins.

## 3. Stack (decided)

- **React + TypeScript + Vite**, compiled to a static bundle, deployed to **GitHub Pages** via a
  GitHub Actions workflow (build `dist/`, publish to Pages). Set Vite `base` to the repo name for
  project Pages. "Runs on gh-pages" holds — the deployed output is plain static files.
- **Sim core is framework-agnostic pure TS** (`model/ sim/ systems/ league/ stats/`), **no React
  import**. React (`ui/`) only renders state the pure core produces.
- **Determinism:** one seeded PRNG (`core/rng.ts`); **no `Math.random` / no wall-clock** in
  `sim/ systems/ league/`. Same league + seed ⇒ byte-identical season (required for sharing + result
  browsing).
- **Testing:** Vitest (unit + determinism), Playwright (e2e — Chromium is pre-installed at
  `/opt/pw-browsers`; do **not** run `playwright install`).

### Module → ownership map (module boundary = ownership boundary; all under `src/`)

| Module | Owner role | Responsibility (GDD §) |
|---|---|---|
| `config.ts` | Balance Owner (**sole writer**) | ALL hidden/tunable tables — Goal Table §8.1, weather % §10, attendance §13, change matrices §16–18, coach pools §12, reason lists §17–18, §23 |
| `core/rng.ts` | Match-Engine Dev | Seeded PRNG + determinism helpers |
| `model/` | Lead (contract) → then read-only shared | TS types, Team Card, league-system, season state, **serialize/deserialize for sharing** §5, §22 |
| `sim/` | Match-Engine Dev | Match resolution, modifiers, OT/penalties §8–9, §15 |
| `systems/` | Systems/Flavour Dev | Weather, attendance, coaches, form, motivation, corruption, crowd, between-season §10, §12–13, §16–18 |
| `league/` | League Dev | Architecture, scheduling, phases, pro/rel, cups, playoffs, international §6, §14–15, §19 |
| `stats/` | League Dev or Systems Dev | Records/history §20 |
| `ui/` | UI/UX Dev | React components, one per file — all screens §21, creator tools §23 |
| `App.tsx`, `main.tsx` | **Lead only** | Shell, routing, wiring |
| `*.test.ts`, `e2e/` | Test Author | Vitest + Playwright |
| `.github/workflows/deploy.yml` | Lead/infra | Build + Pages deploy |

## 4. Team roster (bench — up to 10 live per phase)

Name teammates `[Role]-[Model]-[Task]`. Set each model explicitly at spawn (teammates don't inherit
the lead's). Give each spawn prompt: what already exists in its module, the frozen interface
contract, and exactly what's left to do.

| Role | Model | Owns |
|---|---|---|
| **Lead / Integrator** (the session itself) | Opus | `model/` contract, `App.tsx`/`main.tsx`, workflow, merges, phase go/no-go |
| **Match-Engine Dev** | Opus | `sim/`, `core/rng.ts` |
| **League & Competition Dev** | Sonnet | `league/`, `stats/` |
| **Systems / Flavour Dev** | Sonnet | `systems/` |
| **UI / UX Dev** | Sonnet | `ui/` |
| **Balance Owner** (shared-file, sole writer of `config.ts`) | Fable | `config.ts` |
| **Test Author** | Sonnet | `*.test.ts`, `e2e/` |
| **QA / Verification** (adversary, gates each phase) | Opus | read-only; runs suites, checks numbers vs Excel |
| **Content/Asset** *(subagent, as needed)* | Haiku | reason lists, jersey palettes |

**Per-phase live teams (suggested):**
- **Phase 1:** Lead + Balance Owner + Match-Engine Dev + Test Author. (Foundation, contract, config.)
- **Phase 2:** Lead + Match-Engine Dev + Balance Owner + Test Author + QA.
- **Phase 3:** Lead + League Dev + UI/UX Dev + Test Author + QA.
- **Phase 4:** Lead + Systems/Flavour Dev + Balance Owner + UI/UX Dev + QA.
- **Phase 5:** Lead + UI/UX Dev + League Dev + Test Author + QA (rotate Systems Dev in for progression).

## 5. The 5 phases + exit gates (QA signs off each before merge)

1. **Phase 1 — Foundation (model, config, RNG, sharing).** Vite+React+TS scaffold; `config.ts` with
   Goal Table + core constants transcribed from the workbook; seeded PRNG; Team Card + league-system
   data model; serialize→deserialize **byte-identical**; CI deploy workflow live.
   *Gate:* build a league in memory, round-trip it losslessly, same seed ⇒ same random stream; Pages
   deploy succeeds.
2. **Phase 2 — Match engine.** Full §8 resolution: who-has-the-day, Att-vs-Def + stamina per half,
   modifiers, 2D6 + coach-skill diff, Goal-Table lookup → `Full (HT)` score.
   *Gate:* match fully **reproducible from seed**; GDD worked example reproduces; no `Math.random` in
   `sim/`; unit + determinism tests green.
3. **Phase 3 — League play.** Create league (levels/divisions/teams, random or geographic split),
   schedule (home/away alternation + optional mirroring), simulate match / round / whole season in
   two clicks; standings with configured points + tie-breaks; promotion/relegation + multi-phase
   splits; results browsable round-by-round.
   *Gate:* full season simulates end-to-end with correct table and pro/rel.
4. **Phase 4 — Systemic flavour.** Weather (generation + gameplay/attendance effects), attendance,
   coaches & attributes, form, motivation, home/big-team/derby modifiers, corruption, crowd
   incidents — all toggle-gated per §7. Markers/tooltips render; **no raw numbers to players**.
   *Gate:* each toggle deterministically changes outcomes; flavour renders; numbers verified vs Excel.
5. **Phase 5 — Seasons, cups & full UI.** Between-season progression (stat/size/org/ownership/coach
   changes + change highlights), cups & knockouts, playoffs/OT/penalties, statistics & history,
   international competitions, all §21 screens navigable, creator/balance tools editable, league
   export/import sharing.
   *Gate:* multi-season loop runs with records tracked; league exports + re-imports intact; every §21
   screen reachable; **both** Vitest and Playwright suites green; deployed build smoke-tested.

## 6. Workflow rules (from CLAUDE.md / AGENT_TEAMS.md)

- **Branch per phase** (`Phase-1`…`Phase-5`), branched from latest `main`. **Merge to `main` when the
  phase's QA gate passes**, then branch the next phase from the updated `main`.
- **Lead is integrator + gatekeeper:** owns `App.tsx`/`main.tsx` + merges; **no two teammates edit one
  file**; only Balance Owner writes `config.ts`; teammates leave changes uncommitted and the lead
  verifies (`tsc --noEmit`, `vitest`, determinism) and **commits per verified slice**.
- **Freeze the `model/` interface contract before parallel work** each phase; interface changes route
  through the lead.
- **Verify before "done":** run the suites and drive the app (Playwright/Chromium at
  `/opt/pw-browsers`); after a UI change smoke the built artifact. Give the author a live link
  (deployed Pages URL or a published Artifact) — a localhost dev server a remote session can't reach
  is not enough.
- **Commit cadence:** one task = one focused commit; push after committing. Keep `PROJECT.md` /
  status current **in the same commit** as the code so any session can resume cold.
- **No balance changes:** transcribe verbatim from `docs/source-workbook/`; log provable errors in
  `docs/GDD-discrepancies.md` and get author confirmation before changing a number.

## 7. Repo state at handoff

- On `main` (after this branch merges): `CLAUDE.md`, `AGENT_TEAMS.md`, `GDD.md`, `PROJECT.md`,
  `HANDOFF.md`, `index.html` (landing page), `.claude/settings.json` (teams enabled),
  `docs/source-workbook/` (xlsx + 11 `.tsv` sheets + README), `docs/GDD-discrepancies.md`.
- **No game source yet** — `src/` does not exist. Phase 1 scaffolds it.
- Landing page is served from the `gh-pages` branch; the app deploy workflow will publish the built
  `dist/` to Pages (decide in Phase 1 whether the app replaces or links from the landing page).

## 8. Gotchas

- Agent-teams env var is read **at session start** — a running session won't hot-reload it.
- No nested teams: teammates can't spawn teammates; the lead spawns all.
- In-process teammates don't survive `/resume` — if resuming, re-spawn.
- GitHub ops use the **`mcp__github__*`** tools (no `gh` CLI in this environment).
- Do **not** run `playwright install`; use the pre-installed Chromium.
- Disk is a fixed per-session allowance; delete build artifacts/caches if you hit "no space left".
