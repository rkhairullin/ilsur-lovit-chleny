import { expect, test } from "@playwright/test";

test("page, keyboard link and API work in production build", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Скоро на танцполе",
  );
  // macOS WebKit uses Option+Tab to include links in keyboard navigation.
  // Keep real keyboard traversal; do not replace it with programmatic focus().
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  await expect(
    page.getByRole("link", { name: "Проверить сервер" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/api\/health$/);
  expect(JSON.parse(await page.locator("body").innerText())).toEqual({
    status: "ok",
  });
  expect(errors).toEqual([]);
});

test("browser clock and random values can be controlled", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-01-02T03:04:05.000Z"));
  await page.addInitScript(() => {
    const values = [0.25, 0.75];
    Math.random = () => values.shift() ?? 0.5;
  });
  await page.goto("/");

  expect(
    await page.evaluate(() => ({
      time: new Date().toISOString(),
      random: [Math.random(), Math.random(), Math.random()],
    })),
  ).toEqual({
    time: "2026-01-02T03:04:05.000Z",
    random: [0.25, 0.75, 0.5],
  });
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
]) {
  test(`layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const main = await page.locator("main").boundingBox();
    expect(main).not.toBeNull();
    expect(main!.x).toBeGreaterThanOrEqual(0);
    expect(main!.x + main!.width).toBeLessThanOrEqual(viewport.width);
    const link = await page.getByRole("link").boundingBox();
    expect(link!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
  });
  test(`@visual foundation ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page).toHaveScreenshot(
      `foundation-${viewport.width}x${viewport.height}.png`,
    );
  });
}
