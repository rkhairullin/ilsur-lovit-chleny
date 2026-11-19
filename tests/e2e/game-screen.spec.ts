import { expect, test } from "@playwright/test";

test("keyboard positions, holding, and pause in the production build", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByRole("button", { name: "Начать игру" }).click();
  const game = page.getByRole("main");
  for (const [key, lane] of [
    ["q", "upper-left"],
    ["a", "lower-left"],
    ["o", "upper-right"],
    ["l", "lower-right"],
  ] as const) {
    await page.keyboard.down(key);
    await expect(game).toHaveAttribute("data-position", lane);
    await page.keyboard.up(key);
    await expect(game).toHaveAttribute("data-position", "center");
  }
  await page.keyboard.down("q");
  await page.keyboard.down("l");
  await page.keyboard.down("q");
  await expect(game).toHaveAttribute("data-position", "lower-right");
  await page.keyboard.up("l");
  await expect(game).toHaveAttribute("data-position", "upper-left");
  await page.keyboard.press("Escape");
  const resume = page.getByRole("button", { name: "Продолжить" });
  await expect(resume).toBeFocused();
  await expect(game).toHaveAttribute("data-position", "center");
  await page.keyboard.up("q");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Пауза" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Слева сверху" }),
  ).toBeFocused();
  await page.keyboard.down("Space");
  await expect(game).toHaveAttribute("data-position", "upper-left");
  await page.keyboard.up("Space");
  expect(errors).toEqual([]);
});

test("touch release, multiple pointers and cancellation", async ({
  browser,
}) => {
  const page = await browser.newPage({
    hasTouch: true,
    viewport: { width: 844, height: 390 },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Начать игру" }).click();
  const game = page.getByRole("main");
  const left = page.getByRole("button", { name: "Слева сверху" });
  const right = page.getByRole("button", { name: "Справа снизу" });
  await left.tap();
  await expect(game).toHaveAttribute("data-position", "center");
  // Synthetic pointers make simultaneous and cancelled touches reproducible in both engines.
  await page.evaluate(() => {
    HTMLButtonElement.prototype.setPointerCapture = () => {};
  });
  const pointer = (pointerId: number) => ({
    pointerId,
    pointerType: "touch",
    button: 0,
    bubbles: true,
  });
  await left.dispatchEvent("pointerdown", pointer(1));
  await expect(game).toHaveAttribute("data-position", "upper-left");
  await right.dispatchEvent("pointerdown", pointer(2));
  await expect(game).toHaveAttribute("data-position", "lower-right");
  await right.dispatchEvent("pointercancel", pointer(2));
  await expect(game).toHaveAttribute("data-position", "upper-left");
  await left.dispatchEvent("lostpointercapture", pointer(1));
  await expect(game).toHaveAttribute("data-position", "center");
  await page.close();
});

test("rotation and loss of focus pause and clear input", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Поверните телефон" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Поверните телефон" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Начать игру" }).click();
  await page.keyboard.down("o");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByRole("button", { name: "Продолжить" })).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute(
    "data-position",
    "center",
  );
  await page.keyboard.up("o");
});

test("production API health and deterministic clock and random values", async ({
  page,
  request,
}) => {
  expect(await (await request.get("/api/health")).json()).toEqual({
    status: "ok",
  });
  await page.clock.setFixedTime(new Date("2026-01-02T03:04:05.000Z"));
  await page.addInitScript(() => {
    const values = [0.25, 0.75];
    Math.random = () => values.shift() ?? 0.5;
  });
  await page.goto("/");
  expect(
    await page.evaluate(() => [
      new Date().toISOString(),
      Math.random(),
      Math.random(),
      Math.random(),
    ]),
  ).toEqual(["2026-01-02T03:04:05.000Z", 0.25, 0.75, 0.5]);
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
]) {
  test(`layout ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const bounds = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.scrollHeight,
    ]);
    expect(bounds).toEqual([viewport.width, viewport.height]);
    if (viewport.width > viewport.height) {
      for (const button of await page.getByRole("button").all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  });
  test(`@visual game ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    if (viewport.width > viewport.height) {
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await page.getByRole("button", { name: "Начать игру" }).click();
    }
    await expect(page.getByRole("main")).toHaveAttribute(
      "data-position",
      "center",
    );
    await expect(page).toHaveScreenshot(
      `game-${viewport.width}x${viewport.height}.png`,
    );
  });
}

test("low FPS, visibility pause, catching, defeat and restart", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
    let now = 0;
    let callbacks: FrameRequestCallback[] = [];
    let hidden = false;
    Object.defineProperty(document, "hidden", { get: () => hidden });
    document.addEventListener("test-visibility", () => {
      hidden = !hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    performance.now = () => now;
    window.requestAnimationFrame = (callback) => callbacks.push(callback);
    window.addEventListener("test-frame", (event) => {
      now += (event as CustomEvent<number>).detail;
      const pending = callbacks;
      callbacks = [];
      for (const callback of pending) callback(now);
    });
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const game = page.getByRole("main");
  const tick = (ms: number) =>
    page.evaluate(
      (detail) =>
        window.dispatchEvent(new CustomEvent("test-frame", { detail })),
      ms,
    );
  const toggleHidden = () =>
    page.evaluate(() => document.dispatchEvent(new Event("test-visibility")));
  await expect(game).toHaveAttribute("data-state", "ready");
  await page.getByRole("button", { name: "Начать игру" }).click();
  await tick(900);
  await page.keyboard.down("q");
  await page.keyboard.up("q");
  await expect(page.locator("#caught")).toHaveText("1");
  await toggleHidden();
  await expect(game).toHaveAttribute("data-state", "paused");
  await tick(30000);
  await expect(page.locator("#misses")).toHaveText("0 / 6");
  await toggleHidden();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await tick(20000);
  await expect(game).toHaveAttribute("data-state", "lost");
  await expect(
    page.getByRole("heading", { name: "Gay over", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#misses")).toHaveText("6 / 6");
  await page.getByRole("button", { name: "Играть снова" }).click();
  await expect(game).toHaveAttribute("data-state", "playing");
  await expect(page.locator("#misses")).toHaveText("0 / 6");
  await expect(page.locator("#caught")).toHaveText("0");
  await tick(2939);
  await expect(page.locator("#misses")).toHaveText("0 / 6");
  await tick(1);
  await expect(page.locator("#misses")).toHaveText("1 / 6");
});

test("@visual start, banana in flight and defeat", async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Начать игру" })).toBeVisible();
  await expect.soft(page).toHaveScreenshot("round-ready.png");
  await page.getByRole("button", { name: "Начать игру" }).click();
  await page.clock.fastForward(1469);
  await expect.soft(page).toHaveScreenshot("round-flight.png");
  await page.clock.fastForward(1301);
  await expect.soft(page).toHaveScreenshot("round-fall.png");
  await page.clock.fastForward(15000);
  await expect(
    page.getByRole("button", { name: "Играть снова" }),
  ).toBeFocused();
  await expect.soft(page).toHaveScreenshot("round-lost.png");
});

test("@visual draws overlapping flights and catches either lane independently", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let draw = 0;
    Math.random = () => (draw++ === 17 ? 0.99 : 0);
    const { clearRect, fillText } = CanvasRenderingContext2D.prototype;
    CanvasRenderingContext2D.prototype.clearRect = function (
      x,
      y,
      width,
      height,
    ) {
      this.canvas.dataset.bananas = "0";
      clearRect.call(this, x, y, width, height);
    };
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth,
    ) {
      if (text === "🍌") {
        this.canvas.dataset.bananas = String(
          Number(this.canvas.dataset.bananas) + 1,
        );
      }
      fillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto("/");
  await page.getByRole("button", { name: "Начать игру" }).click();
  const canvas = page.locator("canvas");
  for (let index = 0; index < 16; index++) {
    await page.clock.fastForward(index === 0 ? 600 : 2800);
    await expect(canvas).toHaveAttribute("data-bananas", "1");
    await page.keyboard.press("q");
  }
  await expect(page.locator("#caught")).toHaveText("16");
  await page.clock.fastForward(4000);
  await expect(canvas).toHaveAttribute("data-bananas", "2");
  await expect.soft(page).toHaveScreenshot("round-overlapping-flights.png");
  await page.keyboard.press("l");
  await expect(canvas).toHaveAttribute("data-bananas", "1");
  await page.keyboard.press("q");
  await expect(canvas).toHaveAttribute("data-bananas", "0");
  await expect(page.locator("#caught")).toHaveText("18");
  await expect(page.locator("#misses")).toHaveText("0 / 6");
});
