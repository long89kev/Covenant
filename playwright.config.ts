import { defineConfig, devices } from '@playwright/test'

// Browser checks for the UI shell and honesty rules. They run without a Tide login on purpose: there is
// no auth bypass in this app, so authenticated flows are covered by tests/service.test.ts instead.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3000', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: { command: 'npm run start', url: 'http://localhost:3000/api/health', reuseExistingServer: true, timeout: 120_000 },
})
