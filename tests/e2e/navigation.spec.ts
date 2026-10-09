import { expect, test } from '@playwright/test'
import { openWorkspace } from './local-session'

test('navegação funciona em desktop e celular sem erros de JavaScript', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  test.skip(!await openWorkspace(page), 'Backend configurado: os fluxos autenticados exigem conta local de teste.')
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  const menu = page.getByRole('button', { name: 'Abrir menu' })
  if (await menu.isVisible()) await menu.click()
  await page.getByRole('navigation', { name: 'Navegação principal', exact: true }).getByRole('link', { name: 'Projetos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Seus projetos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Novo projeto', exact: true })).toBeVisible()

  await page.goto('/team')
  await expect(page.getByRole('heading', { name: 'Nossa equipe' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar meu perfil' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('team.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('login mantém navegação por teclado e nomes acessíveis', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/login')
  const password = page.getByLabel('Senha', { exact: true })
  await page.getByLabel('E-mail', { exact: true }).fill('pessoa@exemplo.test')
  await password.fill('senha-de-teste')
  await password.press('Tab')
  await expect(page.getByRole('button', { name: 'Mostrar senha' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(password).toHaveAttribute('type', 'text')
  await expect(page.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true')
  await password.clear()
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})

test('busca por teclado abre diálogo, recebe foco e fecha com Escape', async ({ page }) => {
  test.skip(!await openWorkspace(page), 'Backend configurado: requer conta local de teste.')
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('textbox')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
