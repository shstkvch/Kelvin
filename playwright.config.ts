import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3457',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node dist/index.js serve tests/fixtures/blog.kelvin --port 3457',
    url: 'http://localhost:3457/api/blog/post',
    reuseExistingServer: !process.env.CI,
  },
});
