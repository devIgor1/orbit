import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

// Product imagery is captured from the real, isolated local workspace. Credentials
// stay in the browser login flow and are never written into output or screenshots.
const env = await readFile('.env.local', 'utf8')
if (!/^VITE_SUPABASE_URL=http:\/\/127\.0\.0\.1:55521\s*$/m.test(env)) {
  throw new Error('A captura requer o Supabase local do Orbit na porta 55521.')
}
const credentials = JSON.parse(await readFile('.demo-credentials.json', 'utf8'))
await mkdir('docs/screenshots', { recursive: true })
await mkdir('public/product', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
})
const failures = []
page.on('pageerror', error => failures.push(error.message))
page.on('response', response => {
  const url = new URL(response.url())
  if (url.origin === 'http://127.0.0.1:55521' && !response.ok()) {
    failures.push(`Backend ${url.pathname}: HTTP ${response.status()}`)
  }
})

try {
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByLabel('E-mail', { exact: true }).fill(credentials.email)
  await page.getByLabel('Senha', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar no workspace' }).click()
  await page.waitForURL('**/dashboard')

  const routes = [
    { name: 'dashboard', docName: 'dashboard', path: '/dashboard', heading: 'Visão geral' },
    { name: 'projects', docName: 'projects', path: '/projects', heading: 'Seus projetos' },
    { name: 'board', docName: 'project', path: '/projects/b0b17000-0000-4000-8000-000000000001', heading: 'Aurora — Identidade visual' },
    { name: 'team', docName: 'team', path: '/team', heading: 'Nossa equipe' },
  ]
  for (const route of routes) {
    await page.goto(`http://127.0.0.1:5173${route.path}`)
    await expect(page.getByRole('heading', { name: route.heading, exact: true })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await page.locator('html').evaluate(element => element.ownerDocument.fonts.ready)
    await expect(page.locator('.desktop-sidebar .sidebar-profile strong')).toHaveText('Igor Moraes Rocha')
    await expect(page.getByRole('alert')).toHaveCount(0)
    if (failures.length) throw new Error(failures.join('\n'))
    const source = `docs/screenshots/${route.docName}-desktop.png`
    await page.screenshot({ path: source, animations: 'disabled' })
    await copyFile(source, `public/product/${route.name}.png`)
    console.log(`${route.name}.png — 1440 × 1050; captura real do workspace local.`)
  }
} finally {
  await browser.close()
}
