import { expect, test } from '@playwright/test'

test('cadastro mostra os requisitos e bloqueia senhas incompletas antes do envio', async ({ page }, testInfo) => {
  let signupRequests = 0
  await page.route('**/rest/v1/rpc/check_registration_email', route => route.fulfill({ json: 'available' }))
  await page.route('**/auth/v1/signup**', async (route) => {
    signupRequests += 1
    await route.abort()
  })
  await page.goto('/signup')
  await page.getByLabel('Nome completo').fill('Pessoa de teste')
  await page.getByLabel('E-mail', { exact: true }).fill('senha@example.test')
  const password = page.getByLabel('Senha', { exact: true })
  const confirmation = page.getByLabel('Confirmar senha', { exact: true })
  const checklist = page.getByRole('list', { name: 'Requisitos da senha' })
  await expect(checklist.getByRole('listitem')).toHaveCount(5)
  await expect(password).toHaveAttribute('type', 'password')

  for (const value of ['Abcde1!', 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefgh!', 'Abcdefgh1', 'Abcdefg1 ']) {
    await password.fill(value)
    await confirmation.fill(value)
    await page.getByRole('button', { name: 'Criar minha conta' }).click()
    await expect(password).toHaveAttribute('aria-invalid', 'true')
    await expect(password).toBeFocused()
    await expect(page.locator('#signup-password-error')).toBeVisible()
    expect(signupRequests).toBe(0)
  }

  await password.fill('Abcdef1!')
  await confirmation.fill('Abcdef1!')
  await expect(checklist.locator('[data-met=true]')).toHaveCount(5)
  await expect(page.locator('#signup-password-error')).not.toBeVisible()
  await expect(password).toHaveAttribute('aria-invalid', 'false')
  await expect(page.getByRole('button', { name: 'Criar minha conta' })).toBeEnabled()
  await password.press('Tab')
  const showPassword = page.getByRole('button', { name: 'Mostrar senha', exact: true })
  await expect(showPassword).toBeFocused()
  await showPassword.press('Enter')
  await expect(password).toHaveAttribute('type', 'text')
  await expect(password).toHaveValue('Abcdef1!')
  await expect(confirmation).toHaveAttribute('type', 'password')
  const hidePassword = page.getByRole('button', { name: 'Ocultar senha', exact: true })
  await expect(hidePassword).toHaveAttribute('aria-pressed', 'true')
  await hidePassword.press('Space')
  await expect(password).toHaveAttribute('type', 'password')
  await confirmation.press('Tab')
  const showConfirmation = page.getByRole('button', { name: 'Mostrar confirmação de senha', exact: true })
  await expect(showConfirmation).toBeFocused()
  await showConfirmation.press('Enter')
  await expect(confirmation).toHaveAttribute('type', 'text')
  await expect(confirmation).toHaveValue('Abcdef1!')
  await expect(password).toHaveAttribute('type', 'password')
  await page.getByRole('button', { name: 'Ocultar confirmação de senha', exact: true }).click()
  await expect(confirmation).toHaveAttribute('type', 'password')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('signup-requirements.png'), fullPage: true })
  // Keep this a validation test: never create an account or send confirmation mail.
  expect(signupRequests).toBe(0)
})
