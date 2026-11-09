import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Opt-in real Ollama verification; neither the default tests nor *.e2e.test.ts includes this file.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src") } },
  test: {
    name: "ai-live",
    environment: "node",
    include: ["tests/e2e/ai-model.live.test.ts"],
    globalSetup: ["tests/e2e/globalSetup.ts"],
    testTimeout: 40_000,
    hookTimeout: 960_000,
    fileParallelism: false,
    retry: 0,
  },
});
