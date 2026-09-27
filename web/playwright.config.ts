import { defineConfig, devices } from '@playwright/test'

// One smoke test (W5 in docs/WEB-PARITY-PLAN.md) proving the site actually
// renders against a real backend, not just that `next build` succeeds — CI's
// `web` job already covers typecheck + build, and neither touches a browser.
// The server is started by CI itself (built with `next start`, not `next dev`,
// against the same Postgres-backed backend the api-e2e job seeds); locally,
// point WEB_BASE_URL at a `next dev` you already have running.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: process.env.WEB_BASE_URL || 'http://localhost:3002',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
