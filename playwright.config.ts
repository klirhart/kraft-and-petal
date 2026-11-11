import { defineConfig, devices } from '@playwright/test'

const PORT = 4387
const baseURL = `http://127.0.0.1:${PORT}`
// Set this to use a browser that is already installed instead of Playwright's download.
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined

/*
 * Real-browser checks: keyboard-only journeys and axe scans that include
 * color contrast (which jsdom cannot compute). The app runs on sample data,
 * so no backend or secret is needed.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 740 }, hasTouch: true } },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
