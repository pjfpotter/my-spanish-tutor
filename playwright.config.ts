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
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 5'], ...fakeMic } },
    { name: 'chromebook', use: { ...devices['Desktop Chrome'], ...fakeMic } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
