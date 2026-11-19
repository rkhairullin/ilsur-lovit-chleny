export function readConfig(env: NodeJS.ProcessEnv) {
  const port = Number(env.PORT ?? "3000");
  const host = env.HOST ?? "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  if (host.trim() === "") throw new Error("HOST must not be empty");
  return { host, port };
}

export function readLoginConfig(env: NodeJS.ProcessEnv) {
  const password = env.GAME_PASSWORD;
  if (!password || password.length > 128)
    throw new Error("GAME_PASSWORD must contain 1 to 128 characters");
  return {
    password,
    databasePath: env.DATABASE_PATH ?? "./data/game.sqlite",
    secureCookie: env.NODE_ENV === "production",
  };
}
