import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  snapshotPathTemplate:
    process.platform === "linux"
      ? "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}"
      : "{testDir}/../../.visual-baselines/{testFilePath}/{arg}-{projectName}-{platform}{ext}",
  use: { baseURL: "http://127.0.0.1:3000", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command:
      process.env.PLAYWRIGHT_SKIP_BUILD === "1"
        ? "npm start"
        : "npm run build && npm start",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: false,
    env: {
      HOST: "127.0.0.1",
      PORT: "3000",
      NODE_ENV: "test",
      GAME_PASSWORD: "browser-test-password",
      DATABASE_PATH: join(tmpdir(), `ilsur-playwright-${process.pid}.sqlite`),
    },
  },
});
