import { defineConfig } from "vitest/config";

// End-to-end tests: need `npm run build` first. They start the real server themselves.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.e2e.test.ts"],
    globalSetup: ["tests/e2e/globalSetup.ts"],
    testTimeout: 30_000,
    hookTimeout: 90_000,
    fileParallelism: false,
  },
});
