import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Database tests start an in-process Postgres, which is slow when many workers do it at once.
  test: {
    include: ['lib/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Each file builds its own throwaway database, so files do not share state; reusing workers skips ~0.5s of startup per file.
    isolate: false,
  },
});
