import { readFile, mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Screenshots authenticate only against the explicitly provisioned local backend.
const env = await readFile('.env.local', 'utf8')
if (!/^VITE_SUPABASE_URL=http:\/\/127\.0\.0\.1:55521\s*$/m.test(env)) throw new Error('A captura requer o Supabase local do Orbit.')
const credentials = JSON.parse(await readFile('.demo-credentials.json', 'utf8'))
await mkdir('docs/screenshots', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 })
const failures = []
page.on('pageerror', error => failures.push(error.message))
await page.goto('http://127.0.0.1:5173/login')
await page.getByLabel('E-mail', { exact: true }).fill(credentials.email)
await page.getByLabel('Senha', { exact: true }).fill(credentials.password)
await page.getByRole('button', { name: 'Entrar no workspace' }).click()
await page.waitForURL('**/dashboard')
const routes = {
  dashboard: '/dashboard', projects: '/projects',
  project: '/projects/b0b17000-0000-4000-8000-000000000001', team: '/team',
}
for (const [name, pathname] of Object.entries(routes)) {
  await page.goto(`http://127.0.0.1:5173${pathname}`)
  await page.waitForLoadState('networkidle')
  await page.locator('html').evaluate(element => element.ownerDocument.fonts.ready)
  await page.screenshot({ path: `docs/screenshots/${name}-desktop.png`, fullPage: true })
}
await page.setViewportSize({ width: 820, height: 1180 })
await page.goto('http://127.0.0.1:5173/dashboard')
await page.waitForLoadState('networkidle')
await page.screenshot({ path: 'docs/screenshots/dashboard-tablet.png', fullPage: true })
await page.setViewportSize({ width: 390, height: 844 })
await page.screenshot({ path: 'docs/screenshots/dashboard-mobile.png', fullPage: true })
const login = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await login.goto('http://127.0.0.1:5173/login')
await login.waitForLoadState('networkidle')
await login.screenshot({ path: 'docs/screenshots/login-desktop.png', fullPage: true })
await browser.close()
if (failures.length) throw new Error(failures.join('\n'))
console.log('Capturas de desktop, tablet e celular salvas em docs/screenshots; nenhum erro JavaScript.')
