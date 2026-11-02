import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Playwright runs its own dev server in a separate build folder so it can sit beside `npm run dev`.
  // The in-process test database loads its own files at runtime, so it must not be bundled.
  serverExternalPackages: ['@electric-sql/pglite'],
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
