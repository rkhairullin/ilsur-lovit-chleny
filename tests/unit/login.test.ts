import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
import { createApp } from "../../server/app.js";
import { readLoginConfig } from "../../server/config.js";

const options = {
  password: "ПаРоль",
  databasePath: ":memory:",
  secureCookie: false,
};
const apps: ReturnType<typeof createApp>[] = [];
function makeApp(overrides = {}) {
  const app = createApp({ ...options, ...overrides });
  apps.push(app);
  return app;
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.restoreAllMocks();
});

function enter(
  app: ReturnType<typeof createApp>,
  nickname: string,
  password = options.password,
  cookie = "",
) {
  return app.inject({
    method: "POST",
    url: "/login",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie },
    payload: new URLSearchParams({ nickname, password }).toString(),
  });
}

test("gates the game, alternate paths and private API", async () => {
  const app = makeApp();
  for (const url of ["/", "/index.html"]) {
    expect((await app.inject(url)).headers.location).toBe("/login");
  }
  expect((await app.inject("/%69ndex.html")).headers.location).toBe("/login");
  expect((await app.inject("/api/session")).statusCode).toBe(401);
  expect((await app.inject("/%61pi/session")).statusCode).toBe(401);
  expect((await app.inject("/api/missing")).statusCode).toBe(401);
  expect((await app.inject("/api/health")).statusCode).toBe(200);
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/login",
        headers: { "sec-fetch-site": "cross-site" },
      })
    ).statusCode,
  ).toBe(403);
});

test("validates input and rate-limits incorrect passwords with recovery", async () => {
  let now = 1000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const app = makeApp();
  expect((await app.inject({ method: "POST", url: "/login" })).statusCode).toBe(
    400,
  );
  expect(
    (await app.inject({ method: "POST", url: "/login", payload: {} }))
      .statusCode,
  ).toBe(400);
  expect(
    (
      await app.inject({
        method: "POST",
        url: "/login",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        payload: "unrelated=value",
      })
    ).statusCode,
  ).toBe(400);
  for (const [name, password] of [
    [" ", "a"],
    ["x".repeat(33), "a"],
    ["a\u0000b", "a"],
    ["a", ""],
    ["a", "x".repeat(129)],
  ] as const) {
    expect((await enter(app, name, password)).statusCode).toBe(400);
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await enter(app, "Ринат", "пароль");
    expect(result.statusCode).toBe(401);
    expect(result.body).toContain("Неверный пароль, натурал чертов");
  }
  const blocked = await enter(app, "Ринат");
  expect(blocked.statusCode).toBe(429);
  expect(blocked.headers["retry-after"]).toBe("60");
  now += 60_000;
  expect((await enter(app, "Ринат")).statusCode).toBe(303);
});

test("reuses persisted nicknames, escapes markup, rotates and revokes sessions", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ilsur-login-"));
  try {
    const databasePath = join(dir, "db", "game.sqlite");
    const app = makeApp({ databasePath, secureCookie: true });
    const nickname = "<B>Ё & \"' $&</B>";
    const first = await enter(app, `  ${nickname}  `);
    expect(first.statusCode).toBe(303);
    expect(first.headers["set-cookie"]).toContain(
      "HttpOnly; SameSite=Strict; Secure; Max-Age=604800",
    );
    const cookie = String(first.headers["set-cookie"]).split(";")[0]!;
    const headers = { cookie };
    const profile = (await app.inject({ url: "/api/session", headers })).json();
    expect(profile).toEqual({ id: expect.any(Number), nickname });
    const game = await app.inject({ url: "/", headers });
    expect(game.statusCode).toBe(200);
    expect(game.headers["cache-control"]).toBe("no-store");
    expect(game.body).toContain(
      "&#60;B&#62;Ё &#38; &#34;&#39; $&#38;&#60;/B&#62;",
    );
    expect(
      (await app.inject({ url: "/login", headers })).headers.location,
    ).toBe("/");
    expect(
      (await app.inject({ url: "/api/missing", headers })).statusCode,
    ).toBe(404);
    await app.close();
    apps.pop();

    const reopened = makeApp({ databasePath });
    expect(
      (await reopened.inject({ url: "/api/session", headers })).json(),
    ).toEqual(profile);
    const second = await enter(
      reopened,
      nickname.toLowerCase().normalize("NFD"),
      options.password,
      cookie,
    );
    const newCookie = String(second.headers["set-cookie"]).split(";")[0]!;
    expect(newCookie).not.toBe(cookie);
    expect(
      (await reopened.inject({ url: "/api/session", headers })).statusCode,
    ).toBe(401);
    const newHeaders = { cookie: newCookie };
    expect(
      (
        await reopened.inject({ url: "/api/session", headers: newHeaders })
      ).json(),
    ).toEqual(profile);
    const logout = await reopened.inject({
      method: "POST",
      url: "/logout",
      headers: newHeaders,
    });
    expect(logout.headers.location).toBe("/login");
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");
    expect(
      (await reopened.inject({ url: "/api/session", headers: newHeaders }))
        .statusCode,
    ).toBe(401);
    await reopened.close();
    apps.pop();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("expires a session after seven days", async () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(1000);
  const app = makeApp();
  const result = await enter(app, "Игрок");
  const cookie = String(result.headers["set-cookie"]).split(";")[0]!;
  now.mockReturnValue(1000 + 604800 * 1000);
  expect(
    (await app.inject({ url: "/api/session", headers: { cookie } })).statusCode,
  ).toBe(401);
});

test("requires a configured password", () => {
  expect(() => readLoginConfig({})).toThrow("GAME_PASSWORD");
  expect(() => readLoginConfig({ GAME_PASSWORD: "x".repeat(129) })).toThrow(
    "GAME_PASSWORD",
  );
  expect(readLoginConfig({ GAME_PASSWORD: "x" })).toEqual({
    password: "x",
    databasePath: "./data/game.sqlite",
    secureCookie: false,
  });
  expect(
    readLoginConfig({
      GAME_PASSWORD: "x",
      DATABASE_PATH: "custom",
      NODE_ENV: "production",
    }),
  ).toEqual({ password: "x", databasePath: "custom", secureCookie: true });
});
