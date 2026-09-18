import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
    // Tests run serially against isolated in-memory DBs created per test file,
    // so there's no need for parallel worker isolation tricks here.
    fileParallelism: false,
  },
});
