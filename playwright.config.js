import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
/** Must match vite.config.js `base` (GitHub project Pages). */
const APP_BASE = '/Dashboard-Proyecto-Fotovoltaico/';
const ORIGIN = `http://127.0.0.1:${PORT}`;
const BASE = `${ORIGIN}${APP_BASE}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome']
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
