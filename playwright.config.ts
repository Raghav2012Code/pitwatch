import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI
const PORT = 4173
const URL = `http://127.0.0.1:${PORT}`

// Specs run against the production build, so a shader or chunk that only breaks after
// minification still fails the suite.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: CI ? 1 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
})
