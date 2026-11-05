import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left a debug 'test.only' statement in the source */
  forbidOnly: !!process.env.CI,
  /* Retry a failing test exactly once on CI to account for flaky network conditions */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI to minimize CPU throttling limits */
  workers: process.env.CI ? 1 : undefined,
  /* Highly efficient reporting options */
  reporter: process.env.CI ? 'github' : 'html',
  
  use: {
    /* Base URL for your app, falling back to local port 8080 if not set */
    baseURL: process.env.VERCEL_URL || 'http://localhost:8080',

    /* 🧠 Smart Diagnostic Strategy: Only expend disk I/O on retries */
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
