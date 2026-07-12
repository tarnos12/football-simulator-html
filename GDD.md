# Game Design Document — **World of Sports** (working title)

> *A god-mode fantasy football (soccer) **league simulator**. The player creates
> leagues, sets the rules, seeds the teams, and then simulates seasons —
> authoring their own emergent sports story.*

**Document status:** v0.1 — reconstructed from the source design workbook
*"Sport Sim - World of Sports.xlsx"* (11 sheets + threaded design comments).
This GDD consolidates that brainstorm into a structured, buildable spec. Items
the source flagged as undecided are called out in **[OPEN]** tags. Working
titles under consideration: *League Simulator, Leaguecraft, League Manager,
League World, World of Leagues, World of Sports*.

---

## 1. High Concept

The player is **not** a coach or a manager of a single team. They sit in a
permanent *overseer / "god mode"* position above an entire football pyramid.
They design a league system from scratch (levels, divisions, teams, rules),
optionally add cups, then let the simulation play out — intervening at any time
to tweak teams, stats, or rules. Systemic flavour (weather, attendance,
corruption, crowd trouble, motivation, coach personalities, form, randomness)
turns each simulated season into a **narrative the player builds in their own
head** about that particular league.

## 2. Vision & Design Pillars

1. **Creator-first sandbox.** Nearly everything is configurable at creation and
   editable at any time. The player can go fully default or "go wild".
2. **Emergent storytelling over control.** The joy is watching a league you
   authored unfold, with enough randomness and flavour to create drama.
3. **Systemic depth, simple surface.** Under the hood there are dice tables and
   probability curves; on screen the player sees icons, arrows, and tooltips —
   never raw numbers (unless they open creator tools).
4. **Shareable by design.** Whole league systems (teams, rules, cups) are
   100% shareable so the community can recreate real-world leagues **without
   licensing costs** — everything is user-generated.
5. **Immersion through flavour.** Attendance, jerseys, weather, derbies,
   corruption scandals, crowd riots and coach quirks exist mostly to add
   colour, not to be optimised.

## 3. Genre / Platform / Audience

- **Genre:** Sports management sandbox / league simulator (overseer, not
  team-manager).
- **Reference feel:** Spreadsheet-driven football sim; the workbook mockups
  imply a **web / HTML** front-end (this repo is a "Football HTML Prototype").
- **Audience:** Football-simulation and football-manager hobbyists, fantasy
  bookkeepers, "what-if" tinkerers, and community content creators.

## 4. Core Gameplay Loop

```
CREATE league system ─► SEED teams & stats ─► SET rules & toggles
        │
        ▼
   SIMULATE  (one match ▸ one round ▸ whole season)
        │
        ▼
   VIEW results, tables, stats, attendance, weather, incidents
        │
        ▼
   SEASON END  (champions, promotion/relegation, cup winners)
        │
        ▼
   BETWEEN-SEASON CHANGES  (stats, coaches, ownership, club size,
        │                   corruption deductions, league restructure)
        ▼
   NEXT SEASON  ──────────────────────────────────────► (loop)
```

Simulation granularity the game must support:
- Generate **one match** result at a time.
- Generate **one round/week** — for the whole system, a single division, or a cup.
- Generate a **whole season in two clicks** (initiate + confirm).
- At any point, browse back through every result of the season; at season end,
  show a summary (winners, promoted, relegated, cup winners, etc.).

---

## 5. Data Model — Team Card

Each team is defined by the following attributes (shown to the player as
symbols/arrows; exposed as numbers only in creator/edit tools).

| Attribute | Range | Notes |
|---|---|---|
| **Attack** | 1–9 | Compared against opponent Defence each half. |
| **Defence** | 1–9 | Compared against opponent Attack each half. |
| **Stamina** | 1–9 | Compared between teams as a match modifier. |
| **Form** | +2 … −2 (decimals) | Changes after every match. Shown as up/down arrows, never a number. Season start value random +0.5…−0.5. |
| **Coach** | Skill 1–5 (+ attributes) | Skill affects **only** the 2D6 goal roll. Hover to reveal attributes. |
| **Club Size** | 1–9 | Drives attendance & coach quality; changes at most once / 5 seasons. |
| **Organisation** | 1–9 | Higher = more stable stat changes; low = chaotic swings. Also feeds corruption/crowd risk. |
| **Ownership** | Capitalistic **or** 51% Fans | Capitalistic = bigger/faster stat swings; 51% Fans = slower/smaller. |
| **Location** | Grid X / Y (−10…10 each) | Drives geography, weather exposure, derbies, travel/attendance. |
| **Jersey** | 2–3 shirt colours + pattern, 2–3 short colours | Cosmetic; shown as mini-jersey in tables/results. |

**Example team card (from source):** *Lunds BK* — Club Size 4, Organisation 7,
Ownership 51% (0.51), Coach skill 3, Attack 7, Defence 4, Stamina 6, Form −0.25,
location −10/−5 (far south, slight west).

**Editing:** Every Team Card has an *Edit* button. There is also a
**mass "Edit Division" screen** showing all teams' stats in one grid, with quick
switching between divisions. Clicking a jersey opens the jersey editor.

---

## 6. League Architecture

The player builds the competition top-down. Creation wizard (drop-downs & tick
boxes) steps:

1. **Levels** — how many tiers the pyramid has (name the league system).
2. **Divisions per level** — count and names per level.
3. **Teams per division.** *(Suggested cap ~30 teams/division.)*
4. **Distribution on the same level** — *randomly* or *geographical* (geographic
   uses the location grid: e.g. Div 2 North gets the 12 northernmost of 24 teams,
   Div 2 South the rest).
5. **Matches per pairing** — e.g. play each other 2× (home/away), 4×, or any
   number. Largely unrestricted "go crazy" but with sanity caps.
6. **Phase 1 thresholds/"lines"** — relegation, promotion, qualification,
   playoff, splits.
7. **Phase 2** (optional) — e.g. top-6 split into an elite league, bottom-6 into
   a relegation league, each with new thresholds.
8. **Phase 3+…** — continue until the league is fully resolved (e.g. relegation
   league's second-to-last plays a qualification game in phase 3).
9. **Rules** — set league-wide defaults or override per division (§7).
10–12. **Cup** — decide if a cup exists, set its phases and rules (§14).
13. **Visualisation** — button to render the whole system and all phases.

**Between phases:** carrying points is configurable — **[OPEN]** start Phase 2
with (a) full Phase-1 points, (b) 0 points, or (c) half points rounded down.

**Season-boundary restructuring:** number of teams, divisions, promotion/
relegation counts, etc. can only change **between seasons**, then the season
restarts with the new structure.

**Scheduling rules:**
- Alternate home/away as much as possible for each team.
- Alternate league and cup games through the season where possible.
- *Mirroring* (optional toggle): 2nd half of the schedule mirrors the first in
  reverse; mid-season a team is played twice in a row, then order reverses back
  to the opening fixture.

---

## 7. League Rules & Toggles (set at creation, editable between seasons)

Rules can be set once and reused every season; most can only change **between**
seasons, and can differ **per division** within the same system.

| Rule / Toggle | Type | Effect |
|---|---|---|
| **Point system** | Value | 2 or 3 points per win (creator may set custom points for win/draw/loss). |
| **Tie-break order** | Ordered drop-down | Default: 1) Goal diff, 2) Goals scored, 3) Head-to-head, 4) Coin toss. Order is prioritisable. |
| **Home game advantage** | Tick (default ON) | Home team gets **+1 Att/Def/Sta**. |
| **League Corruption** | Tick | Chance teams start a season on minus points (§17). Frequency L/M/H + deduction span, per league or division. |
| **Big team advantage** | Tick | If a club is **3+ Club Sizes** bigger than the opponent, it gets **+1 Att & +1 Def** (crowd sways the ref). |
| **Weather** | Tick | Weather affects games (§10). If OFF, weather still displays but has no gameplay effect. |
| **Motivation** | Tick | Teams in contention for a threshold get a late-season bonus (§9). |
| **Violent/Disruptive crowd** | Tick | Chance of disrupted games / 0–3 forfeit loss (§18). |
| **Mirroring game schedule** | Tick | Reverse-mirror second half of fixtures (see §6). |
| **Derby rules** | Tick | Derby **halves** the Att/Def/Sta difference between the two teams, rounded down. On activation, set how many grid cells apart still counts as a derby (default 0 = same cell). |
| **Form** | Tick | If OFF, form is simply not calculated into results. |
| **Team owners** | Drop-down | Capitalistic / Mix / 51% Fans (Mix reveals a change-frequency drop-down). |
| **Team Stat changes** | Drop-down | Random / Slow (Semi-Random) / On Hold (Static) / *[future]* Draft mode. |
| **Club size changes** | Drop-down | Static / small chance every 5 seasons (default) / chance every 5 seasons / small chance every season / chance every season. |
| **Club Organisation change** | Drop-down | Static / chance of random change between seasons. |
| **Climate** | Drop-down | Warm (no snow) / Temperate (all weather) / Cold (no Very Warm). |

---

## 8. Match Resolution System (core simulator)

A match is resolved in **two halves**. Overview:

1. **"Who has the day"** — roll **once per team** at match start; a value **0–3**
   representing which side the football gods favour that day. Added as a bonus
   to that team.
2. For **each half** (2 halves):
   - **a. Attack vs Defence** — each team's Attack is compared to the opposing
     team's Defence.
   - **b. Compare Stamina** between the teams.
   - **c. Apply all bonuses** — home advantage, big-team advantage, motivation,
     weather, derby (halving), "who has the day", form, etc.
   - **d. Net difference** → selects a **column** in the Goal Table (§8.1).
   - **e. Roll 2D6**, then **add the Coach-skill difference** to the team with
     the better coach. Read the resulting goals scored from the Goal Table.
3. **Final score = Half 1 + Half 2**, displayed as `Full (HT)` e.g.
   `Team A – Team B 4–1 (1–0)`.

> **Worked example (from source):** Team A (Att5/Def2/Sta7/Form−0.25/Coach4) vs
> Team B (Att6/Def4/Sta4/Form0.75/Coach2). After rolling "who has the day",
> comparing Att/Def and Stamina, and adding bonuses each half, then rolling 2D6
> (+coach diff to the stronger coach), the sim produced `4–1 (1–0)`.

### 8.1 The Goal Table  *(creator-only; hidden from players)*

Rows = **team difference** (attacking side's effective Attack minus defending
side's Defence, after all bonuses, from **+12 and higher** down to **−12 and
lower**). Columns = **2D6 roll** (2–12, extendable to **13–16** only via the
Coach-skill difference). Cell = **goals scored** by the attacking side for that
half.

> *Read example:* if a team is **+5** stronger (Attack vs opposing Defence), the
> minimum roll needed to score is **6**; a roll of **9** yields **2 goals**.

| Diff ↓ / Roll → | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|--|--|--|--|--|--|--|--|--|--|--|--|--|--|--|
| **≥12** | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 | 7 |
| **11** | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 |
| **10** | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 | 6 |
| **9** | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 |
| **8** | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 | 6 |
| **7** | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 |
| **6** | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 |
| **5** | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 | 5 |
| **4** | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 |
| **3** | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 |
| **2** | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 5 |
| **1** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 |
| **0** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 |
| **−1** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 | 4 |
| **−2** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 |
| **−3** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 |
| **−4** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 | 4 |
| **−5** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 |
| **−6** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 |
| **−7** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 | 3 |
| **−8** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 |
| **−9** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 | 3 |
| **−10** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 |
| **−11** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 | 2 |
| **≤−12** | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 2 |

*(Columns 13–16 are only reachable when the Coach-skill difference is added to
the 2D6 roll.)*

---

## 9. Match Modifiers (summary)

| Modifier | Trigger | Effect |
|---|---|---|
| **Home advantage** | Toggle on, home team | +1 Att/Def/Sta. Removed on neutral ground. |
| **Big team advantage** | Club Size diff ≥ 3 | +1 Att & +1 Def to the bigger club. |
| **Who has the day** | Every match | +0…+3 per team (one roll each). |
| **Derby** | Teams within derby range | **Halves** Att/Def/Sta difference between teams (rounded down). Away crowd tripled (§13). |
| **Motivation** | Late-season contention | +1 Att/Def/Sta to any team still in contention for **any** threshold (champion, promotion, relegation, qualification). Creator sets how many games before season end it activates. Removed the moment a team is no longer in contention. Marked in table & result page. |
| **Form** | Toggle on | Adds the team's Form value (+2…−2) into calculations. |
| **Coach skill** | Every 2D6 goal roll | Coach-skill difference added to the roll of the better-coached side. |
| **Weather** | Toggle on | Per-condition effects (§10). |

**Motivation worked example:** set to activate 5 games out. Any team that can
still reach a threshold (e.g. Team A safe, Team B in a qualification spot, Team C
facing relegation but still mathematically able to escape) receives the +1
bonus, and loses it as soon as their fate is sealed.

---

## 10. Weather System

Weather is generated on the **location grid** and can spread to neighbouring
cells. It affects both **gameplay** (if the toggle is on) and **attendance**
(always cosmetic). Climate setting gates which conditions can appear.

| Condition | Icon | Gameplay effect | Attendance |
|---|---|---|---|
| **Sunny** | ☀️ | None | **+10%** (adds) |
| **Light overcast** | 🌤️ | None | **+** (adds) |
| **Heavy overcast** | ☁️ | None | Neutral |
| **Light rain** | 🌦️ | **+1 Attack** to both teams | Lowers |
| **Heavy rain** | ⛈️ | Attack & Defence **cap at 5** for both teams | **−50%** (lowers) |
| **Snowing** | ❄️ | **[OPEN]** likely Stamina caps at 5 | Lowers |
| **Muddy** | 🕳️ | **+1 Defence** to both teams | Neutral |
| **Windy** | 💨 | **+1 Att & +1 Def** to each team, but only **one half each** | Neutral |
| **Very warm / "Scorching"** | 🔥 | **[OPEN]** | Lowers |

**Weather generation (per week, independent checks):**
- **Heavy rain:** 30% chance one cell; if one, 20% for a second; if two, 10% for
  a third. Surrounding cells get **light rain**.
- **Light rain:** can also appear alone — 70% chance 10 cells; if so, 30% for 5
  more.
- **Snow** (Temperate/Cold only): 15% chance of a 3×3 block; if one, 50% for
  another 3×3.
- **Muddy:** 100% chance 5 cells get muddy each week.
- **Windy:** three independent checks — 80% / 60% / 40% each affecting 5 cells.
- **Very warm** (Temperate/Warm only): 15% of a 3×3 block; 50% for a second.
- **Fill remaining empty cells:** ⅓ Sunny, ⅓ Light overcast, ⅓ Heavy overcast.

*(Percentages are tunable in creator tools.)*

---

## 11. Location & Geography

- A grid map, **X and Y from −10 to +10** (10 = most north/east, −10 = most
  south/west). Each team occupies a cell (e.g. Lunds BK at −10/−5).
- **Uses:** geographic division splits, weather exposure, derby detection,
  travel distance for attendance.
- **Derby:** two teams in the **same cell** = derby; in higher divisions the
  derby range may extend to adjacent cells (configurable via Derby rule).
- Player can view all teams' locations (whole league or per division), and
  **[OPEN]** possibly add/remove teams directly on the map.

---

## 12. Coaches

Every coach has a **skill (1–5)** and **at least one attribute** (positive or
negative). Skill affects **only** the 2D6 goal roll. Attributes are fixed for a
coach and change only when the coach changes — but the **player may hand-edit** a
coach's attributes/skill (e.g. to imitate a real manager). Hover a coach to see
their attributes/effects.

**Attribute count distribution when generating a coach:**
- 30% → **1 attribute** (random, good or bad)
- 60% → **2 attributes** (80% one good + one bad; 10% two good; 10% two bad)
- 10% → **3 attributes** (always a mix — never all-good or all-bad)

### Positive attributes

| Name | Effect | Flavour |
|---|---|---|
| **Back of the net!** *(alt "Charge!")* | +1 Attack | Improves the team's attack skill. |
| *(Defence trait)* | +1 Defence | Improves the team's defence skill. |
| *(Stamina trait)* | +1 Stamina | Improves the team's stamina skill. |
| *(Fortune trait)* | +1 to "Who has the day" | Things go well for this coach. |
| **Always fine-tuning** | Higher chance Form **increases** after a match | Strengthens team form. |
| *(Attendance trait — "Fun and Games")* | +10% attendance (home & away) | Draws bigger crowds. |
| *(Penalty trait)* | 70% chance to win a penalty shootout | Cool under pressure. |
| *(Motivation trait)* | +1 to the motivational bonus (if team has it) | Extra motivation. |
| *(Loyalty trait)* | −30% risk to leave the club after a season | So loved they may never be fired. |
| *(Assistant trait)* | +1 Coach skill (max 4 diff to other coach) | Great assistants boost skill. |
| *(Honourable trait)* | Negates any chance the team is caught in corruption | Never corrupt. |

### Negative attributes

| Name | Effect | Flavour |
|---|---|---|
| **One too many passes** | −1 Attack | Weakens attack. |
| **Defence Schmefence** | −1 Defence | Doesn't care about defence. |
| **Let them come to us** | −1 Stamina | Weakens stamina. |
| **Dull and dim** | −1 to "Who has the day" | The gods rarely smile. |
| **Whatever will be, will be** | Higher risk Form **decreases** after a match | Weakens form. |
| **Yawnfest** | −10% attendance (home & away) | Boring play, smaller crowds. |
| **Cursed** | Only 30% chance to win a penalty shootout | Nervy under pressure. |
| **Status Quo** | Negates own team's motivational bonus | Removes motivation. |
| **Needy Diva** | +30% risk to leave the club after a season | Makes enemies, may get fired. |
| **I know the best** | −1 Coach skill (max 4 diff to other coach) | Won't listen to anyone. |
| *(Corruptible trait)* | +20% risk of being caught in corruption | Higher corruption risk. |

> A coach can hold **both** the +1 and −1 version of the same stat (net zero) —
> intentional, to maximise combinations and produce funny narrative pairings.

**Coach changes — see §16.**

---

## 13. Attendance System *(cosmetic / immersion only — no gameplay impact)*

Attendance is computed from **home Club Size**, **away Club Size + travel
distance**, **weather**, **coach traits**, **derby**, and two randomising dice.

**Base crowd by Club Size:**

| Club Size | Home crowd | Away crowd |
|---|---|---|
| 9 | 40,000 | 4,000 |
| 8 | 30,000 | 3,000 |
| 7 | 25,000 | 2,500 |
| 6 | 20,000 | 2,000 |
| 5 | 15,000 | 1,500 |
| 4 | 10,000 | 1,000 |
| 3 | 8,000 | 800 |
| 2 | 5,000 | 500 |
| 1 | 2,000 | 200 |

**Distance modifier (share of away crowd that travels):**

| Distance from home cell | Away crowd factor |
|---|---|
| ≤ 2 cells | (highest) |
| ≤ 5 cells | ↓ |
| ≤ 9 cells | ↓↓ |
| ≤ 14 cells | ↓↓↓ |
| > 14 cells | ~0 (basically none) |

*(Example calibration: a 7-cell trip = ~40% of the away base attends.)*

**Then apply, in order:** derby (away crowd **×3**), coach attendance traits
(±10% each), weather (±10% sunny/other), and finally two dice:
- **Roll 1:** odd/even → decides whether Roll 2 **adds or subtracts**.
- **Roll 2:** 1–30 → the percentage the attendance shifts by.

> **Worked example:** Home team Club Size 7 (25,000), away Club Size 4 (1,000),
> away travels 7 cells (40% → 400). Sunny (+10% both) → home 27,500, away 440,
> base 27,940. Die 1 odd → subtract; Die 2 = 11 → −11% → **final 24,867**.
>
> **Theoretical max** (two size-9 teams, same-cell derby, sunny, both coaches
> with the attendance trait, max dice) ≈ **87,880**.
> **Theoretical min** (two size-1 teams, heavy rain, long travel, both coaches
> "Yawnfest", max negative dice) ≈ **420**.

---

## 14. Cups & Knockouts

- A league system may optionally include a **cup**, with its own phases and
  rules. Cup rules **default to the league's** but can be overridden.
- Cup shapes range from a **pure single-phase knockout** to **combined
  group-stage + knockout** across several phases.
- Bigger divisions can **auto-pass** early rounds (e.g. top divisions enter
  later). Teams are randomly drawn against each other each round.
- **Group→knockout example (from source):** groups of 4, top 2 advance, until 2
  teams remain for a single **final on neutral ground**; group-mates or
  same-P2-group teams can't meet again until the final.
- Draws and progression are shown on a **Cup Table / Cup Draw** screen.

---

## 15. Playoffs, Overtime, Penalties & Aggregates

- **Single-game decider** (final, qualification): often on **neutral ground**
  (home advantage removed) — creator's choice.
- **Best-of series** (e.g. best of 3): a team must win two; home game alternates,
  with the higher-placed/points team getting the **extra home game**.
- **Aggregate (two-leg):** combined score of home + away; best combined total
  wins.
- **Overtime:** re-roll a result using the **same modifiers as the second half**.
- **Penalties:** flat **50/50** base, then simulate a plausible shootout score
  (e.g. 2–0, 3–1, 4–2, 5–3 …; realistic cap referenced at 25–24). Coach penalty
  traits shift the odds (70% / 30%).
- Overtime & penalties trigger whenever a draw isn't allowed (cup final,
  equal aggregate, equal series).

---

## 16. Between-Seasons Progression

At season end, a chain of random changes is generated (all tables are
creator-tunable and normally hidden from the player). Before the first games of a
new season, opening a team **highlights every changed value** (green/red; no
highlight if unchanged).

**Club Size change** (probabilities, "N"ormal column shown; a "Slow" column also
exists):

| Change | Prob (Normal) |
|---|---|
| +2 | 0.10 |
| +1 | 0.20 |
| 0 | 0.40 |
| −1 | 0.20 |
| −2 | 0.10 |

**Team stat changes (Att/Def/Sta):** one roll **per stat** per team (so a team
might get +1 Att, −2 Def, 0 Sta). Change rate depends on **Ownership**
(Capitalistic = bigger swings; 51% Fans = more stable) and **Organisation**
(higher Org = tighter distribution around 0). Full probability matrices are in
the source per Org level 1–9, for both ownership types, in "Normal" and "Slow"
variants. *(See Appendix / source sheet "Changes between seasons".)*

**Club Organisation change** (per season, if allowed):

| From | −3 | −2 | −1 | 0 | +1 | +2 | +3 |
|---|--|--|--|--|--|--|--|
| Capitalistic | 0.05 | 0.15 | 0.20 | 0.20 | 0.20 | 0.15 | 0.05 |
| 51% Fans | 0.01 | 0.09 | 0.20 | 0.40 | 0.20 | 0.09 | 0.01 |

**Ownership change** (only if league allows; player sets frequency; locked for X
seasons after a change): Capitalistic→51% ≈ 1–5% chance; strong bias to stay.

**Coach change between seasons** (chance the coach leaves; rises the longer they
stay):

| Situation | Y1 | Y2 | Y3 | Y4 | Y5 | Y6 |
|---|--|--|--|--|--|--|
| No relegation / no title | 0.10 | 0.20 | 0.40 | 0.60 | 0.70 | 0.80 |
| Champion / promoted | 0.05 | 0.15 | 0.40 | 0.50 | 0.60 | 0.70 |
| Relegated | 0.90 | 0.90 | 0.90 | 0.90 | 0.90 | 0.90 |

*(After Y6 the percentage stays as Y6. A new coach resets the timer to Y1.)*

**New coach generation** — skill distribution scales with Club Size (bigger clubs
skew to higher skill), attribute count per §12.

**Mid-season coach change [OPEN / possibly future — "might be too complicated"]:**
Coaches can't be fired before the season's halfway mark. After that:
- **Losing streak:** 5 losses → 10%, 6 → 20%, 7 → 40%, 8 → 60%, 9 → 80%, 10 →
  90%. A win between losses drops the counter **2 steps**.
- **Winless streak:** 8 → 5%, 9 → 15%, 10 → 30%, 11 → 50%, 12 → 70%, 13 → 90%. A
  win drops the counter **3 steps**. Enough wins to clear the threshold resets it.

**Form change after each match** (Max +2 / Min −2; three columns — Normal, Coach-
Positive, Coach-Negative):

| Change per match | Normal | Coach + | Coach − |
|---|--|--|--|
| −0.06 … −0.10 | 0.15 | 0.10 | 0.20 |
| −0.01 … −0.05 | 0.20 | 0.15 | 0.25 |
| No change | 0.30 | 0.30 | 0.30 |
| +0.01 … +0.05 | 0.20 | 0.25 | 0.15 |
| +0.06 … +0.10 | 0.15 | 0.20 | 0.10 |

**Team replacement at season boundary** (for promoted-out/relegated teams the
creator chooses): keep as-is · manually edit · randomly draw a replacement from a
pool · clone previous team stats with random tweaks (replaced team returns to the
pool and may come back later).

---

## 17. Corruption System

If corruption is enabled (league- or division-level), each season some teams may
**start on minus points**.

- Player sets **frequency** (Low / Medium / High) and the **point-deduction span**
  (e.g. −3 to −12).
- **Catch probability per season:**

| Frequency | Caught | Not caught |
|---|---|---|
| Low | 0.01 | 0.99 |
| Medium | 0.05 | 0.95 |
| High | 0.15 | 0.85 |

- A caught team gets a random deduction within the span, a **random reason** from
  the list, and a season-long marker in the table (hover shows reason + points
  lost). The honourable coach trait **negates** corruption chance; the corruptible
  trait adds +20% risk.
- **Reason list (creator-editable):** Match-fixing · False accounting · Insolvency
  & administration · Wage delays · Bribing referees · Bribing official clerks ·
  Third-party ownership · Fielding ineligible players · Bringing the game into
  disrepute · Tax evasion · Not paying transfer fees · Falsified player
  information · Spied on competitors · Hacked competitors · Bought players too
  young.

---

## 18. Violent / Disruptive Crowd System

If enabled, a per-game **incident risk** is driven by **Club Size × Organisation**
(bigger club + worse organisation → higher risk). Example calibration: Club Size
8, Organisation 2 → ~3% incident risk per game.

- On an incident: instead of an automatic forfeit, there's a **chance** the team
  is punished with a **0–3 loss** (to avoid it happening too often). A marker
  always appears on the result; hover reveals a reason.
- If **both** teams trigger, both roll for the 0–3 loss; if both fail, both lose
  0–3.
- **Reason list (creator-editable):** crowd violence in the stands · pitch
  invasion · pig's head thrown · moped thrown on the pitch · police intervene ·
  fire in the stands · game called off (unsafe) · players fighting fans ·
  barricades fail · bangers thrown · crowd destroying stands · police stand-off ·
  activists handcuffed to a goalpost · smoke bombs · racist chanting · players
  fighting · owner attacks officials · bomb scare · streaker · power outage.

---

## 19. International Leagues / Cups

- Choose which league systems feed each international competition, how many teams
  qualify from each, and the phases/rules.
- Each league system has a **strength rating 1–9**. A stronger league's team is
  favoured even with lower base stats (e.g. Team A from a strong league beats
  Team B with higher raw stats). All normal bonuses then apply; neutral-ground
  games remove home advantage.
- A mass-edit screen (like league mass edit) lets the creator set country/league
  strengths.
- Reaching an international competition counts as "champion/promoted" for coach-
  change purposes.

---

## 20. Statistics & History

Available from league screens and per-team pages; also a creator/dev view for
balance. Records to track:

- **All-time table** for the top division (optionally each division).
- Most championships; every past season's final tables (browse "who won season
  10").
- Most relegations; highest finish by a brand-new team.
- Highest / lowest winning points total; biggest / smallest title-winning margin.
- Most / fewest goals scored in a season (and ever).
- Highest points that still got relegated; fewest points in a season.
- Longest winning / unbeaten / losing / winless streaks.
- Most goals in a single game; biggest win / biggest loss.
- Highest-scoring draw; highest-scoring match.
- Average points to be champion / to avoid relegation; best & worst goal
  difference.
- **Head-to-head** between any two teams; same set for the Cup if one exists.
- **Dev stats:** most common scoreline, most common post-bonus team difference,
  count of leagues/teams created *(may be low-value since users can change rules
  freely)*.

---

## 21. UI / Screens

- **Results tab** (per round): match list with `Full (HT)` scores, weather icon
  per match (hover tooltip describing impact in plain language, not numbers),
  attendance, derby highlight, overtime marker, incident/corruption markers, and
  ◀ Prev / Next ▶ week navigation.
- **Table tab:** standings with mini-jersey + team name; games played; W-D-L;
  goals for/against; points with up/down movement indicator; sub-views for
  **Home**, **Away**, **Last X games ("Form")**; attendance/other stats column;
  a "position after each game" line chart; threshold annotations
  (Champion / Relegated / Qualification, etc.).
- **Navigation:** jump between divisions via arrows or a drop-down; switch
  country for international competitions.
- **Cup screen:** Cup Table / Cup Draw view.
- **Team Card** (+ Edit), **Edit Division** mass grid, **Location Map**, **Jersey
  Editor** (2–3 shirt colours + pattern from a list, 2–3 short colours; mini-
  jersey preview).
- **League visualisation:** one button renders the whole system and all phases.
- **Season-end summary:** champions, promoted, relegated, cup winners, records.

*(The source "Pics" sheet holds crude mockups: league visualisation, per-game
position chart, and jersey solutions — to be modernised in the actual UI.)*

---

## 22. Sharing & Community

- League systems (teams, stats, rules, cups, locations, jerseys) are **100%
  shareable**. The community can recreate real leagues/teams entirely through
  user-generated content, sidestepping licensing costs.
- Rule sets and team pools are saveable and reusable across seasons.

## 23. Creator / Balance Tools

- **All hidden tables** (goal table, weather %, attendance, change matrices,
  corruption/crowd odds, reason lists) must be **accessible and editable by the
  designer** for tuning and balance — and, where noted, by advanced players.
- Reason lists (corruption, crowd incidents) need an easy add/remove editor.

## 24. Open Questions & Future Ideas  **[OPEN]**

- Snowing and Very Warm gameplay effects not finalised (snow ≈ Stamina cap 5?).
- Rename **Very Warm → "Scorching"**.
- Coach positive-attack trait name: **"Back of the net!"** vs **"Charge!"**; find
  a better name for the stamina/attack style trait (Tiki-Taka, Total Football,
  etc.).
- Mid-season coach firing may be too complex for v1 → future.
- **Draft mode** for stat changes (worst team gets a boost) → future.
- Phase-carry-over point rules; team-name display format in result lists;
  additional table stats.
- Add/remove teams directly on the location map.

## 25. Appendix — Source Mapping

Reconstructed from workbook sheets: **Game** (vision) · **League Creation and
Edit** (§6–7, mass edit) · **TeamCoachAttendence** (§5, §12, §13, jerseys) ·
**Location and Weather** (§10–11) · **Goal Table and more** (§8.1, violent crowd
§18) · **How to calculate match results** (§8–9, playoffs §15, motivation, views
§21) · **Changes between seasons** (§16–17) · **Example 1 & 2 LeagueCup**
(worked phase/cup structures) · **StatisticHistory** (§20) · **Pics** (mockups).
Full numeric matrices for per-Organisation stat-change probabilities live in the
source sheet "Changes between seasons" and should be imported verbatim into the
balance-tuning data files.
