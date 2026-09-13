import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

// Browser binaries stay inside the project, so setup is reproducible on Windows.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright');

export default defineConfig({
  testDir: './tests/integration',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--enable-unsafe-webgpu', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
