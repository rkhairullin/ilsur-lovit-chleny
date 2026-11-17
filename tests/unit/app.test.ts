import { afterEach, expect, test } from "vitest";
import { createApp } from "../../server/app.js";

const apps: ReturnType<typeof createApp>[] = [];
afterEach(async () => {
  await Promise.all(apps.map((app) => app.close()));
  apps.length = 0;
});

test("serves health, page and stylesheet; rejects missing routes", async () => {
  const app = createApp();
  apps.push(app);
  const health = await app.inject("/api/health");
  expect(health.statusCode).toBe(200);
  expect(health.json()).toEqual({ status: "ok" });
  const page = await app.inject("/");
  expect(page.statusCode).toBe(200);
  expect(page.headers["content-type"]).toContain("text/html");
  expect(page.body).toContain("Скоро на танцполе");
  const css = await app.inject("/style.css");
  expect(css.statusCode).toBe(200);
  expect(css.headers["content-type"]).toContain("text/css");
  for (const path of ["/api/missing", "/missing", "/package.json", "/.env"]) {
    expect((await app.inject(path)).statusCode).toBe(404);
  }
});
