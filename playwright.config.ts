import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test",
  testMatch: /.*\.pw-spec\.ts/,
  timeout: 30000,
  use: {
    headless: true,
  },
});
