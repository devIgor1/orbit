import { readFile, mkdir } from 'node:fs/promises'
import { chromium, expect } from '@playwright/test'

const env = await readFile('.env.local', 'utf8')
if (!/^VITE_SUPABASE_URL=http:\/\/127\.0\.0\.1:55521\s*$/m.test(env))
  throw new Error('A revisão requer o backend local do Orbit.')
const credentials = JSON.parse(await readFile('.demo-credentials.json', 'utf8'))
const destination = 'docs/screenshots/dashboard-redesign'
await mkdir(destination, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' })
const errors = []
page.on('pageerror', (error) => errors.push(error.message))
try {
  await page.goto('http://127.0.0.1:5173/login')
  await page.getByLabel('E-mail', { exact: true }).fill(credentials.email)
  await page.getByLabel('Senha', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar no workspace' }).click()
  await page.waitForURL('**/dashboard')
  for (const [name, width, height] of [
    ['desktop', 1440, 1050],
    ['tablet', 820, 1180],
    ['mobile', 390, 844],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto('http://127.0.0.1:5173/dashboard')
    await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible()
    await expect(page.locator('.metric-value').first()).not.toHaveText('—')
    await page.waitForLoadState('networkidle')
    await page.locator('html').evaluate((element) => element.ownerDocument.fonts.ready)
    await page.locator('.evolution-panel').scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        page.locator('.evolution-chart').evaluate((element) => {
          const svg = element.querySelector('.recharts-surface')
          return svg ? Math.abs(svg.getBoundingClientRect().width - element.getBoundingClientRect().width) : 100
        }),
      )
      .toBeLessThan(1)
    await page.getByRole('heading', { name: 'Visão geral', exact: true }).scrollIntoViewIfNeeded()
    await expect(page.getByRole('alert')).toHaveCount(0)
    if (await page.locator('html').evaluate((element) => element.scrollWidth > element.clientWidth))
      throw new Error(name + ' overflow')
    await page.screenshot({ path: destination + '/dashboard-' + name + '.png', fullPage: true })
    console.log(
      JSON.stringify({
        viewport: name,
        overflow: await page.locator('html').evaluate((element) => element.scrollWidth > element.clientWidth),
        metrics: await page.locator('.metric-value').allTextContents(),
      }),
    )
    if (width < 900) {
      await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
      await page.screenshot({ path: destination + '/menu-' + name + '.png' })
      await page.keyboard.press('Escape')
    }
    await page.getByRole('button', { name: 'Novo projeto', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.screenshot({ path: destination + '/project-dialog-' + name + '.png' })
    await page.keyboard.press('Escape')
  }
  for (const [name, path] of [
    ['projects', '/projects'],
    ['team', '/team'],
    ['settings', '/settings'],
  ]) {
    await page.setViewportSize({ width: 1440, height: 1050 })
    await page.goto('http://127.0.0.1:5173' + path)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.screenshot({ path: destination + '/' + name + '-desktop.png', fullPage: true })
    if (await page.locator('html').evaluate((element) => element.scrollWidth > element.clientWidth))
      throw new Error(name + ' overflow')
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('Revisão de telas concluída sem erros de JavaScript.')
} finally {
  await browser.close()
}
