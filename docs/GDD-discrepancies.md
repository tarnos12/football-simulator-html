# GDD / Workbook Discrepancies & `[OPEN]` Decisions

A running log of places where the source numbers are **provably wrong or internally inconsistent**,
or where the GDD leaves an item `[OPEN]`. Per `PROJECT.md`, teammates do **not** silently change any
value — a discrepancy is recorded here and the fix applied **only after the author confirms**.

## How to use

1. Found a suspect value or an `[OPEN]` gap while transcribing? Add a row below.
2. Notify the lead; the lead loops in the author.
3. Record the author's decision and the resolution (which file/value changed, or "kept as-is").
4. Until resolved, transcribe the **workbook value as-is** and flag the code with a `// TODO(discrepancy #n)`.

## Log

| # | Location (sheet / GDD §) | Issue | Proposed fix | Author decision | Status |
|---|---|---|---|---|---|
| 1 | `How_to_calculate_match_results` worked example vs GDD §7/§9 | GDD says Home advantage = **+1 Att/Def/Sta**, but the workbook's worked example applies **+1 Att/Def only** (Stamina is *not* boosted by home). Reproducing the GDD/workbook worked example `4–1 (1–0)` (the Phase-2 gate) **requires** Att/Def only. | Follow the workbook: home = +1 Att/Def. Made tunable via `config.homeAdvantage.stats` so it can be flipped to include Sta if the author wants. | _pending author confirm_ | Applied (workbook value), flagged |
| 2 | `Location_and_Weather` / GDD §10, §24 | **Snowing** gameplay effect undecided in source ("maybe stamina max 5"). | Implement as config-driven cap (`config.weather.snow.staminaCapEnabled`), **default OFF** (cosmetic/attendance only) until author confirms. Attendance effect (−20% home / −75% away) is applied per workbook. | _pending author confirm_ | Applied (default off), flagged |
| 3 | `Location_and_Weather` / GDD §10, §24 | **Very warm** gameplay effect: workbook says "the stamina negation/equaliser for first half is removed" (i.e. first-half stamina is applied at **full**, not halved). GDD had it `[OPEN]`. | Implemented per workbook: Very warm ⇒ H1 stamina not halved. Tunable. | _pending author confirm_ | Applied (workbook value), flagged |

## Open GDD items to resolve before/at the phase that needs them (GDD §24)

- **Snowing** gameplay effect — GDD suggests "Stamina caps at 5" but marks it `[OPEN]`; confirm from
  workbook / author before Phase 4 weather.
- **Very Warm / "Scorching"** gameplay effect — `[OPEN]`; also possible rename Very Warm → Scorching.
- **Phase carry-over points** between league phases — full / 0 / half rounded down (`[OPEN]`, GDD §6).
- **Coach positive-attack trait name** — "Back of the net!" vs "Charge!"; stamina/attack style trait
  name (`[OPEN]`, GDD §12/§24).
- **Mid-season coach firing** — flagged possibly-too-complex-for-v1 (`[OPEN]`, GDD §16/§24).
- **Draft mode** for stat changes — future (`[OPEN]`, GDD §7/§24).
- **Add/remove teams directly on the location map** — `[OPEN]`, GDD §11/§24.
