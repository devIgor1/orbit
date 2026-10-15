import { defineConfig, devices } from '@playwright/test'
import { notificationTestConfig } from './tests/support/notification-backend'

const config = notificationTestConfig()
export default defineConfig({
  testDir: './tests/e2e', testMatch: ['notifications.spec.ts', 'invitation-notifications.spec.ts'], fullyParallel: false, workers: 1,
  timeout: 60_000, reporter: 'list', outputDir: 'test-results/notifications',
  use: { baseURL: 'http://127.0.0.1:5187', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: { width: 900, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', viewport: { width: 320, height: 720 } } },
  ],
  webServer: {
    command: 'npm run dev -- --mode notifications-test --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: config.API_URL, VITE_SUPABASE_PUBLISHABLE_KEY: config.ANON_KEY },
  },
})
