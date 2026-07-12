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
| _(none yet)_ | | | | | |

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
