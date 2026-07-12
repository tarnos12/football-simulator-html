import { describe, it, expect } from "vitest";
import {
  GOAL_TABLE,
  GOAL_TABLE_DIFFS,
  GOAL_TABLE_ROLLS,
  goalTableLookup,
  CHANGES,
  COACH,
  CROWD,
} from "./config";

describe("Goal Table (§8.1) transcription", () => {
  it("has 25 difference rows and 15 roll columns", () => {
    expect(GOAL_TABLE.length).toBe(25);
    expect(GOAL_TABLE_DIFFS.length).toBe(25);
    expect(GOAL_TABLE_ROLLS.length).toBe(15);
    for (const row of GOAL_TABLE) expect(row.length).toBe(15);
  });

  it("matches the worked-example read: diff +5, roll 6 → min to score; roll 9 → 2 goals", () => {
    // "if a team is +5 stronger, the minimum roll needed to score is 6"
    expect(goalTableLookup(5, 5)).toBe(0);
    expect(goalTableLookup(5, 6)).toBe(1);
    // "a roll of 9 yields 2 goals"
    expect(goalTableLookup(5, 9)).toBe(2);
  });

  it("reproduces the GDD worked-example lookups", () => {
    // First half: diff 4 roll 9 → 1 ; diff 1 roll 6 → 0
    expect(goalTableLookup(4, 9)).toBe(1);
    expect(goalTableLookup(1, 6)).toBe(0);
    // Second half: diff 6 roll 11 → 3 ; diff −1 roll 10 → 1
    expect(goalTableLookup(6, 11)).toBe(3);
    expect(goalTableLookup(-1, 10)).toBe(1);
  });

  it("clamps out-of-range differences and rolls", () => {
    expect(goalTableLookup(99, 16)).toBe(7); // ≥12, roll 16
    expect(goalTableLookup(-99, 2)).toBe(0); // ≤−12, roll 2
    expect(goalTableLookup(0, 100)).toBe(goalTableLookup(0, 16));
  });
});

describe("Balance-table probability sanity", () => {
  it("club-size change distributions sum to 1", () => {
    expect(sum(CHANGES.clubSize.slow)).toBeCloseTo(1, 6);
    expect(sum(CHANGES.clubSize.normal)).toBeCloseTo(1, 6);
  });

  it("club-org change distributions sum to 1", () => {
    expect(sum(CHANGES.clubOrg.capitalistic)).toBeCloseTo(1, 6);
    expect(sum(CHANGES.clubOrg.fans)).toBeCloseTo(1, 6);
  });

  it("every per-org stat-change row sums to 1", () => {
    for (let org = 1; org <= 9; org++) {
      expect(sum(CHANGES.statCapitalistic[org])).toBeCloseTo(1, 6);
      expect(sum(CHANGES.statFans[org])).toBeCloseTo(1, 6);
    }
  });

  it("every coach-skill-by-club-size row sums to 1", () => {
    for (let size = 1; size <= 9; size++) {
      expect(sum(COACH.skillByClubSize[size])).toBeCloseTo(1, 6);
    }
  });

  it("coach attribute-count and form distributions sum to 1", () => {
    expect(sum(COACH.attributeCount)).toBeCloseTo(1, 6);
    expect(sum(COACH.twoAttrSplit)).toBeCloseTo(1, 6);
    expect(sum(CHANGES.form.normal)).toBeCloseTo(1, 6);
    expect(sum(CHANGES.form.coachPositive)).toBeCloseTo(1, 6);
    expect(sum(CHANGES.form.coachNegative)).toBeCloseTo(1, 6);
  });

  it("violent-crowd calibration example: size 8 / org 2 → 3%", () => {
    expect(CROWD.riskBySizeOrg[8][2]).toBeCloseTo(0.03, 6);
  });
});

function sum(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
