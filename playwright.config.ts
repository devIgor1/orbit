import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.ORBIT_E2E_PORT ?? 5173)

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['onboarding.spec.ts', 'invitation-email.spec.ts', 'member-management.spec.ts', 'registration-email.spec.ts', 'notifications.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI && !process.env.ORBIT_E2E_PORT,
  },
})
