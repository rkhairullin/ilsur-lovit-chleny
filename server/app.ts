import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";

import { registerLogin, type LoginOptions } from "./login.js";

export function createApp(options: LoginOptions) {
  const app = Fastify({ logger: true });
  app.get("/api/health", async () => ({ status: "ok" }));
  app.register(fastifyStatic, {
    root: fileURLToPath(new URL("../client/", import.meta.url)),
    index: false,
    allowedPath: (path) => !path.endsWith(".html"),
  });
  registerLogin(app, options);
  return app;
}
