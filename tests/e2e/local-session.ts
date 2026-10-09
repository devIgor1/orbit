import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'

export async function localCredentials() {
  try {
    const env = await readFile('.env.local', 'utf8')
    if (!/^VITE_SUPABASE_URL=https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\/?\s*$/m.test(env)) return null
    const credentials: unknown = JSON.parse(await readFile('.demo-credentials.json', 'utf8'))
    if (typeof credentials !== 'object' || credentials === null || !('email' in credentials) || !('password' in credentials) || typeof credentials.email !== 'string' || typeof credentials.password !== 'string') return null
    return { email: credentials.email, password: credentials.password }
  } catch { return null }
}

export async function openWorkspace(page: Page, pathname = '/dashboard') {
  await page.goto(pathname)
  await page.locator('h1').first().waitFor({ state: 'attached' })
  if (!page.url().includes('/login')) return true
  const credentials = await localCredentials()
  if (!credentials) return false
  await page.getByLabel('E-mail', { exact: true }).fill(credentials.email)
  await page.getByLabel('Senha', { exact: true }).fill(credentials.password)
  await page.getByRole('button', { name: 'Entrar no workspace' }).click()
  await expect(page).toHaveURL(url => url.pathname === pathname.split('?')[0])
  if (pathname.includes('?')) await page.goto(pathname)
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible()
  return true
}
