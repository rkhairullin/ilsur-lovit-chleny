import { afterEach, expect, test } from "vitest";
import { createApp } from "../../server/app.js";

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

test("serves health, page and stylesheet; rejects missing routes", async () => {
  const app = createApp({
    password: "test-pass",
    databasePath: ":memory:",
    secureCookie: false,
  });
  apps.push(app);
  const health = await app.inject("/api/health");
  expect(health.statusCode).toBe(200);
  expect(health.json()).toEqual({ status: "ok" });
  const page = await app.inject("/login");
  expect(page.statusCode).toBe(200);
  expect(page.headers["content-type"]).toContain("text/html");
  expect(page.body).toContain("Ильсур - пИтух");
  expect(page.body).toContain("<button>Начать петушить</button>");
  expect(page.body).toContain("Имя свое скажи, если ты мущщщщина");
  expect(page.body).toContain("Пароль (знают все четкие пацаны)");
  const css = await app.inject("/games/ilsur-lovit-chleny/style.css");
  expect(css.statusCode).toBe(200);
  expect(css.headers["content-type"]).toContain("text/css");
  for (const path of [
    "/games/ilsur-lovit-chleny/index.html",
    "/missing",
    "/package.json",
    "/.env",
  ]) {
    expect((await app.inject(path)).statusCode).toBe(404);
  }
});
