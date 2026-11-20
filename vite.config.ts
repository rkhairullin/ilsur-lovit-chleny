import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: ["index.html", "instructions.html"].map((page) =>
        fileURLToPath(
          new URL(`./client/games/ilsur-lovit-chleny/${page}`, import.meta.url),
        ),
      ),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3000" },
  },
});
