import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'
import { createLocalAccount, createLocalCompany } from './onboarding-helpers'

test.beforeAll(async () => {
  const env = await readFile('.env.docker.local', 'utf8')
  if (!/^VITE_SUPABASE_URL=http:\/\/(?:127\.0\.0\.1|localhost):55521\/?\s*$/m.test(env)) throw new Error('Registration tests require local Supabase')
})
test('e-mail existente é identificado antes da senha e mantém a conta original', async ({ page, browser }, info) => {
  expect(info.project.use.baseURL).toBe('http://127.0.0.1:5174')
  const suffix = randomUUID()
  const email = `registered-${suffix}@example.test`
  const company = `Cadastro original ${suffix.slice(0, 8)}`
  await createLocalAccount(page, email)
  await createLocalCompany(page, company)
  const context = await browser.newContext({ ...info.project.use, baseURL: 'http://127.0.0.1:5174' })
  const signup = await context.newPage()
  let submissions = 0
  signup.on('request', request => { if (new URL(request.url()).pathname === '/auth/v1/signup') submissions++ })
  try {
    await signup.goto('/signup')
    await signup.getByLabel('E-mail', { exact: true }).fill(email.toUpperCase())
    await expect(signup.getByText(/Este e-mail já está cadastrado/)).toBeVisible()
    await expect(signup.getByLabel('Senha', { exact: true })).toHaveValue('')
    await expect(signup.getByRole('button', { name: 'Criar minha conta' })).toBeDisabled()
    expect(submissions).toBe(0)
    await signup.getByText(/Este e-mail já está cadastrado/).scrollIntoViewIfNeeded()
    await signup.screenshot({ path: info.outputPath('registered-email.png') })
    expect(await signup.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await signup.getByLabel('E-mail', { exact: true }).fill(`available-${suffix}@example.test`)
    await expect(signup.getByText(/Este e-mail já está cadastrado/)).not.toBeVisible()
    await expect(signup.getByRole('button', { name: 'Criar minha conta' })).toBeEnabled()
    await signup.getByLabel('E-mail', { exact: true }).fill(email)
    await expect(signup.getByRole('link', { name: 'Entrar na minha conta' })).toHaveAttribute('href', '/login?next=%2Fonboarding')
    // Simulate a stale preflight (another tab registered in the meantime).
    // The final signup still reaches the real local Auth and must reject it.
    await signup.route('**/rest/v1/rpc/check_registration_email', route => route.fulfill({ json: 'available' }))
    await signup.getByLabel('E-mail', { exact: true }).fill(`available-${suffix}@example.test`)
    await expect(signup.getByRole('button', { name: 'Criar minha conta' })).toBeEnabled()
    await signup.getByLabel('E-mail', { exact: true }).fill(email)
    await signup.getByLabel('Nome completo', { exact: true }).fill('Outra pessoa')
    await signup.getByLabel('Senha', { exact: true }).fill('Outra-senha-2026!')
    await signup.getByLabel('Confirmar senha', { exact: true }).fill('Outra-senha-2026!')
    await signup.getByRole('button', { name: 'Criar minha conta' }).click()
    await expect(signup.getByRole('alert')).toHaveText('Já existe uma conta com este e-mail. Entre para continuar.')
    await expect(signup.getByRole('heading', { name: 'Confira seu e-mail' })).not.toBeVisible()
    expect(submissions).toBe(1)
    await signup.getByRole('link', { name: 'Entrar', exact: true }).click()
    await expect(signup).toHaveURL(/\/login\?next=%2Fonboarding$/)
    await signup.getByLabel('E-mail', { exact: true }).fill(email)
    await signup.getByLabel('Senha', { exact: true }).fill('Outra-senha-2026!')
    await signup.getByRole('button', { name: 'Entrar no workspace' }).click()
    await expect(signup.getByRole('alert')).toBeVisible()
    await signup.getByLabel('Senha', { exact: true }).fill('Orbit-test-password-2026!')
    await signup.getByRole('button', { name: 'Entrar no workspace' }).click()
    await expect(signup).toHaveURL(/\/onboarding$/)
    await signup.goto('/dashboard')
    await expect(signup.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible()
    await expect(signup.getByText(company, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    expect(submissions).toBe(1)
  } finally { await context.close() }
})

test('cadastro pendente oferece reenvio real da confirmação', async ({ page }, info) => {
  expect(info.project.use.baseURL).toBe('http://127.0.0.1:5174')
  const email = `pending-${randomUUID()}@example.test`
  await page.goto('/signup')
  await page.getByLabel('Nome completo', { exact: true }).fill('Pessoa pendente')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('Orbit-test-password-2026!')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Orbit-test-password-2026!')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByRole('heading', { name: 'Confira seu e-mail' })).toBeVisible()
  // Move only this local fixture's cooldown; never mutate the hosted Auth.
  await promisify(execFile)('docker', ['exec', 'supabase_db_orbit', 'psql', '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1',
    '-c', `update auth.users set confirmation_sent_at=now()-interval '2 minutes' where email='${email}'`])
  await page.goto('/signup')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await expect(page.getByText(/cadastro aguardando confirmação/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Criar minha conta' })).toBeDisabled()
  await page.getByRole('button', { name: 'Reenviar confirmação' }).click()
  await expect(page.getByRole('status')).toHaveText(/Solicitação recebida/)
  await expect.poll(async () => {
    const response = await page.request.get('http://127.0.0.1:55524/api/v1/messages')
    const inbox: { messages: { To: { Address: string }[] }[] } = await response.json()
    return inbox.messages.filter(message => message.To.some(recipient => recipient.Address === email)).length
  }).toBe(2)
})
