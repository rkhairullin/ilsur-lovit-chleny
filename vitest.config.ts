import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["server/**/*.ts", "client/**/*.ts", "scripts/**/*.{js,mjs,ts}"],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
