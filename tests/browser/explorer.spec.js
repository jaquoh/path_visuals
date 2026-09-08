import { test, expect } from "@playwright/test";

test("explore datasets, modes, floors and playback on desktop and mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Tile availability must not determine whether the app works.
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.getByText("Courier 01", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hide all", exact: true }).click();
  await expect(
    page.getByText("No objects selected.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show all", exact: true }).click();
  await page
    .getByRole("button", { name: "Play movement", exact: true })
    .click();
  await expect(page.locator("#time")).not.toHaveValue("1000");
  await page
    .getByRole("button", { name: "Pause movement", exact: true })
    .click();
  for (const mode of ["Points", "Density", "Paths"]) {
    const button = page.getByRole("button", { name: mode, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page
    .getByRole("button", { name: "demo-campus.csv", exact: false })
    .click();
  await expect(page.getByText("Robot 01", { exact: true })).toBeVisible();
  await page.locator("#floor").selectOption("1");
  await expect(page.locator("#floor")).toHaveValue("1");
  await page
    .getByRole("button", { name: "demo-walk.gpx", exact: false })
    .click();
  await expect(
    page.getByText("Morning walk [1]", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#floor")).toHaveValue("all");
  await page
    .getByRole("button", { name: "Data format guide", exact: false })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  expect(errors).toEqual([]);
});

test("empty and malformed dataset states are actionable", async ({ page }) => {
  await page.route("**/api/files", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  await expect(
    page.getByText("No data files yet.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play movement", exact: true }),
  ).toBeDisabled();
  await page.unroute("**/api/files");
  await page.route("**/api/dataset?*", (route) =>
    route.fulfill({
      status: 422,
      json: { detail: "Row 2: invalid coordinate" },
    }),
  );
  await page.getByRole("button", { name: "Refresh", exact: false }).click();
  await expect(page.getByText("Row 2: invalid coordinate")).toBeVisible();
});
