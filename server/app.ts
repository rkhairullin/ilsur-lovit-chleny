import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";

export function createApp() {
  const app = Fastify({ logger: true });
  app.get("/api/health", async () => ({ status: "ok" }));
  app.register(fastifyStatic, {
    root: fileURLToPath(new URL("../client/", import.meta.url)),
    index: "index.html",
  });
  return app;
}
