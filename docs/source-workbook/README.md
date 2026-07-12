# Source Workbook — exact numbers & balancing

This folder is the **authoritative source of exact numbers and balancing** for the simulator, per the
author: *"Use Excel for numbers/balancing (don't change those numbers in the actual game) and the GDD
for the gameplay loop."*

- **`Sport_Sim_World_of_Sports.xlsx`** — the original workbook (11 sheets), committed verbatim.
- **`*.tsv`** — a flat tab-separated dump of each sheet (cell values, blank cells preserved as empty
  columns) so numbers can be diffed, grepped, and transcribed without opening Excel.

## Order of authority

**Excel → `GDD.md` → `PROJECT.md`.** The GDD was distilled *from* this workbook. For any **value**
(probability, threshold, table cell, formula), the **workbook wins**. The GDD wins only where it adds
structure the sheet lacks (gameplay loop, screen flow, section organization).

## Transcription rule (hard constraint)

Every balance number in `src/config.ts` is copied **verbatim** from these sheets — no rounding,
"improving," or rebalancing. The only permitted change is a value that is **provably wrong or
internally inconsistent**; those are logged in [`../GDD-discrepancies.md`](../GDD-discrepancies.md)
and applied only after the author confirms.

## Sheet → subsystem map

| Sheet (`.tsv`) | Feeds (GDD §) |
|---|---|
| `Game` | Vision / high concept (§1) |
| `League_Creation_and_Edit` | League architecture, rules & toggles, mass edit (§6–7) |
| `TeamCoachAttendence` | Team Card, coaches & attributes, attendance (§5, §12–13) |
| `Location_and_Weather` | Location grid, weather generation & effects (§10–11) |
| `Goal_Table_and_more` | **Goal Table** + violent-crowd incident matrix & reason list (§8.1, §18) |
| `How_to_calculate_match_results` | Match resolution, modifiers, playoffs, motivation, views (§8–9, §15, §21) |
| `Changes_between_seasons` | Between-season progression + corruption matrices (§16–17) |
| `Example_1_LeagueCup`, `Example_2_LeagueCup` | Worked league/cup structures (§14) |
| `StatisticHistory` | Records to track (§20) |
| `Pics` | Crude UI mockups (§21) |

## Known gaps the workbook fills (not fully in the GDD)

- **Violent-crowd incident probabilities** — full Club-Size (1–9) × Organisation (1–9) matrix
  (`Goal_Table_and_more.tsv`); the GDD only quotes the Size 8 / Org 2 → 3% example.
- **Per-Organisation between-season stat-change matrices** — full probability tables live in
  `Changes_between_seasons.tsv`; the GDD (§16) points to them rather than reproducing every cell.

Transcribe these from the sheet, not from the GDD prose.
