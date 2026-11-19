import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
]) {
  test(`first and repeated login, access and logout at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/index.html");
    await expect(page).toHaveURL(/\/login$/);
    expect((await page.request.get("/api/session")).status()).toBe(401);
    const nickname = `<Лиса> ${test.info().project.name}-${viewport.width}`;
    await page.getByLabel("Имя свое скажи, если ты мущщщщина").fill(nickname);
    await page.getByLabel("Пароль (знают все четкие пацаны)").fill("wrong");
    await page.getByRole("button", { name: "Начать петушить" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Неверный пароль, натурал чертов",
    );
    await page.getByLabel("Имя свое скажи, если ты мущщщщина").fill(nickname);
    await page
      .getByLabel("Пароль (знают все четкие пацаны)")
      .fill("browser-test-password");
    await page.getByLabel("Пароль (знают все четкие пацаны)").press("Enter");
    const player = await (await page.request.get("/api/session")).json();
    expect(player.nickname).toBe(nickname);
    await page.reload();
    await page.getByRole("button", { name: "Начать игру" }).click();
    await page.getByRole("button", { name: "Пауза" }).click();
    await expect(page.locator("#player-nickname")).toHaveText(
      `Игрок: ${nickname}`,
    );
    await page.getByRole("button", { name: "Выйти" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Ильсур - пИтух",
      }),
    ).toBeVisible();
    expect((await page.request.get("/api/session")).status()).toBe(401);
    await page
      .getByLabel("Имя свое скажи, если ты мущщщщина")
      .fill(` ${nickname.toLowerCase()} `);
    await page
      .getByLabel("Пароль (знают все четкие пацаны)")
      .fill("browser-test-password");
    await page.getByRole("button", { name: "Начать петушить" }).click();
    await expect(
      page.getByRole("button", { name: "Начать игру" }),
    ).toBeVisible();
    expect(await (await page.request.get("/api/session")).json()).toEqual(
      player,
    );
  });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 844, height: 390 },
  { width: 390, height: 844 },
]) {
  test(`@visual login form ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Ильсур - пИтух" }),
    ).toBeVisible();
    const character = page.getByRole("img", { name: "Ильсур в образе петуха" });
    await expect(character).toHaveJSProperty("naturalWidth", 1194);

    await expect(
      page.getByRole("button", { name: "Начать петушить" }),
    ).toBeInViewport({ ratio: 1 });
    await expect(page).toHaveScreenshot(
      `login-${viewport.width}x${viewport.height}.png`,
    );
  });
}

test("@visual player and logout on the mobile pause screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.request.post("/login", {
    form: { nickname: "Игрок теста", password: "browser-test-password" },
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Начать игру" }).click();
  await page.getByRole("button", { name: "Пауза" }).click();
  await expect(page.getByRole("button", { name: "Выйти" })).toBeInViewport();
  await expect(page.locator("#paused")).toHaveScreenshot("pause-844x390.png");
});
