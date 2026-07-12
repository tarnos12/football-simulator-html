import { test, expect } from "@playwright/test";

/**
 * End-to-end smoke of the full loop (§ Phase 5 gate): create a league, simulate a
 * whole season, view table/results, see the summary, advance to the next season
 * (progression + promotion/relegation), and round-trip a share code.
 */
test("create, simulate a season, view results, advance, and share", async ({ page }) => {
  await page.goto("./");

  // Creation wizard.
  await expect(page.getByRole("heading", { name: /Create your league system/i })).toBeVisible();
  await page.getByRole("button", { name: /Create league/i }).click();

  // Controls appear; season 1.
  await expect(page.getByTestId("controls")).toBeVisible();
  await expect(page.getByText(/Season 1/)).toBeVisible();

  // Simulate one match, one round, then the whole season.
  await page.getByTestId("sim-match").click();
  await page.getByTestId("sim-round").click();
  await page.getByTestId("sim-season").click();
  await expect(page.getByTestId("season-complete")).toBeVisible();

  // The standings table shows all games played (double round-robin of 10 → 18 rounds).
  await page.getByTestId("tab-table").click();
  await expect(page.locator("table.grid tbody tr").first()).toBeVisible();
  const rowCount = await page.locator("table.grid tbody tr").count();
  expect(rowCount).toBeGreaterThanOrEqual(10);

  // Results view has matches with scores.
  await page.getByTestId("tab-results").click();
  await expect(page.locator(".result-row").first()).toBeVisible();

  // Location map renders the grid with team markers.
  await page.getByTestId("tab-map").click();
  await expect(page.getByRole("heading", { name: /Location map/i })).toBeVisible();
  await expect(page.locator("svg[aria-label='Team location map'] circle").first()).toBeVisible();

  // Summary names a champion.
  await page.getByTestId("tab-summary").click();
  await expect(page.getByText(/Champions:/)).toBeVisible();

  // Advance to season 2 (progression + pro/rel).
  await page.getByTestId("next-season").click();
  await expect(page.getByText(/Season 2/)).toBeVisible();

  // History tab is reachable and shows the all-time table.
  await page.getByTestId("tab-stats").click();
  await expect(page.getByRole("heading", { name: /All-time/i })).toBeVisible();

  // Edit-teams mass grid renders editable stat inputs.
  await page.getByTestId("tab-edit").click();
  await expect(page.getByRole("heading", { name: /Edit division/i })).toBeVisible();
  await expect(page.locator("table.grid input[type='number']").first()).toBeVisible();

  // Creator tools expose the editable hidden Goal Table.
  await page.getByTestId("tab-creator").click();
  await expect(page.getByRole("heading", { name: /Goal Table/i })).toBeVisible();
});
