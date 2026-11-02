import { defineConfig, devices } from '@playwright/test';

// Chromium only: it is the engine behind Android Chrome and Chromebooks, which are our main
// devices. iPhone Safari cannot be covered here and is a manual check (see task 2.1).
const fakeMic = {
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 5'], ...fakeMic } },
    { name: 'chromebook', use: { ...devices['Desktop Chrome'], ...fakeMic } },
  ],
  webServer: {
    // Always its own server, never one already running: a dev server pointed at the real database
    // would receive the tests' profiles. Own port and build folder so it can run beside `npm run dev`.
    command: 'npm run dev -- --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    // A throwaway in-process Postgres with the seed course, so tests never write to the real database.
    env: { DB_DRIVER: 'pglite', NEXT_DIST_DIR: '.next-test' },
    timeout: 120_000,
  },
});
