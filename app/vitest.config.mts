import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20_000,
  },
});
