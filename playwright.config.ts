import { defineConfig, devices } from '@playwright/test';

// Chromium only: it is the engine behind Android Chrome and Chromebooks, which are our main
// devices. iPhone Safari cannot be covered here and is a manual check (see task 2.1).
const fakeMic = {
  permissions: ['microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
};

// The phone project runs every test. The Chromebook project (a wide screen, a headset microphone) runs only the
// files where the device matters, so a normal run is about half the browser work. E2E_FULL=1 runs everything on both.
const FULL = !!process.env.E2E_FULL || !!process.env.CI;
const CHROMEBOOK_FILES = /(speech-spike|speech-capture|clip-playback|desktop|tele-lab|journey)\.spec\.ts$/;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 3,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 5'], ...fakeMic } },
    { name: 'chromebook', use: { ...devices['Desktop Chrome'], ...fakeMic }, ...(FULL ? {} : { testMatch: CHROMEBOOK_FILES }) },
  ],
  webServer: {
    // Always its own server, never one already running: a dev server pointed at the real database
    // would receive the tests' profiles. Own port and build folder so it can run beside `npm run dev`.
    // A production build is much faster to test against than `next dev`, which compiles each page on first visit.
    // E2E_DEV=1 uses the dev server instead, handy while editing a page.
    command: process.env.E2E_DEV ? 'npm run dev -- --port 3100' : 'npx next build && npx next start --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    // A throwaway in-process Postgres with the seed course, so tests never write to the real database.
    env: { DB_DRIVER: 'pglite', NEXT_DIST_DIR: '.next-test', DEV_OWNER_TOKEN: 'e2e-owner-token-0123456789' },
    timeout: 240_000, // a production build happens first
  },
});
