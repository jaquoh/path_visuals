import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL: "http://127.0.0.1:8765" },
  webServer: {
    command: "uv run uvicorn path_visuals.app:app --host 127.0.0.1 --port 8765",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: true,
  },
});
