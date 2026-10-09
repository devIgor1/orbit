import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { createLocalAccount, createLocalCompany, createLocalInvitation } from './onboarding-helpers'

test.beforeAll(async () => {
  const env = await readFile('.env.docker.local', 'utf8')
  if (!/^VITE_SUPABASE_URL=http:\/\/(?:127\.0\.0\.1|localhost):55521\/?\s*$/m.test(env))
    throw new Error('Onboarding E2E requires the isolated local Supabase environment')
})

test.beforeEach(async ({ page }, testInfo) => {
  expect(testInfo.project.use.baseURL).toBe('http://127.0.0.1:5174')
  await page.route('**/auth/v1/**', async (route) => {
    if (new URL(route.request().url()).port !== '55521') {
      await route.abort()
      throw new Error('Refusing to authenticate against a remote backend')
    }
    await route.continue()
  })
})

test('cadastro, confirmação, empresa, convite e Kanban persistem entre sessões', async ({
  page,
  browser,
}, testInfo) => {
  const backendRequests: string[] = []
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/rest/v1')) backendRequests.push(request.url())
  })
  const suffix = randomUUID()
  const company = `Estúdio ${testInfo.project.name} ${suffix.slice(0, 8)}`
  const collaboratorEmail = `member-${suffix}@example.test`
  await createLocalAccount(page, `owner-${suffix}@example.test`)
  await page.screenshot({ path: testInfo.outputPath('companies-empty.png'), fullPage: true })
  await createLocalCompany(page, company)
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click()
  await page.getByLabel('Nome do projeto').fill('Projeto compartilhado')
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('link', { name: 'Projeto compartilhado', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/)
  const projectUrl = page.url()
  const invitation = await createLocalInvitation(page, collaboratorEmail)
  await page.screenshot({ path: testInfo.outputPath('invite-created.png'), fullPage: true })
  const collaboratorContext = await browser.newContext({ ...testInfo.project.use, baseURL: 'http://127.0.0.1:5174' })
  const colleague = await collaboratorContext.newPage()
  try {
    await createLocalAccount(colleague, collaboratorEmail, invitation.pathname + invitation.search)
    await expect(colleague.getByRole('button', { name: `Aceitar convite de ${company}` })).toBeVisible()
    await colleague.screenshot({ path: testInfo.outputPath('incoming-invite.png'), fullPage: true })
    await colleague.getByRole('button', { name: `Aceitar convite de ${company}` }).click()
    await expect(colleague).toHaveURL(/\/dashboard$/)
    await colleague.goto('/team')
    await expect(colleague.getByRole('button', { name: 'Convidar colaborador' })).toHaveCount(0)
    await expect(colleague.locator('.member-card')).toHaveCount(2)
    await colleague.goto(projectUrl)
    await colleague.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
    await colleague.getByLabel('Nome da tarefa').fill('Entrega do colaborador')
    await colleague.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
    await expect(colleague.getByRole('dialog')).not.toBeVisible()
    const status = colleague.getByRole('combobox', { name: 'Status de Entrega do colaborador', exact: true })
    await status.focus()
    await colleague.keyboard.press('Enter')
    await colleague.keyboard.press('End')
    await colleague.keyboard.press('Enter')
    await expect(status).toHaveText('Concluído')
    await colleague.reload()
    await expect(status).toHaveText('Concluído')
    await colleague.screenshot({ path: testInfo.outputPath('collaborator-kanban.png'), fullPage: true })
    expect(await colleague.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.goto(projectUrl)
    await expect(page.getByRole('combobox', { name: 'Status de Entrega do colaborador', exact: true })).toHaveText(
      'Concluído',
    )
    await colleague.goto('/companies')
    await createLocalCompany(colleague, `Outra empresa ${suffix.slice(0, 8)}`)
    await colleague.goto('/projects')
    await expect(colleague.getByRole('link', { name: 'Projeto compartilhado', exact: true })).toHaveCount(0)
    await colleague.goto('/companies')
    await colleague.getByRole('button', { name: `Abrir ${company}`, exact: true }).click()
    await colleague.reload()
    await colleague.goto(projectUrl)
    await expect(status).toHaveText('Concluído')
  } finally {
    await collaboratorContext.close()
  }
  expect(backendRequests.length).toBeGreaterThan(0)
  expect(backendRequests.every((url) => new URL(url).port === '55521')).toBe(true)
  expect(errors).toEqual([])
})

test('cadastro responsivo e convite cancelado não concedem acesso', async ({ page }, testInfo) => {
  await page.goto('/signup')
  await expect(page.getByLabel('Nome completo')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('signup.png'), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const suffix = randomUUID()
  await createLocalAccount(page, `revoke-owner-${suffix}@example.test`)
  await createLocalCompany(page, `Empresa de convite ${suffix.slice(0, 8)}`)
  const email = `revoked-${suffix}@example.test`
  const invitation = await createLocalInvitation(page, email)
  await page.getByRole('button', { name: `Cancelar convite para ${email}` }).click()
  await expect(page.getByRole('status')).toHaveText('Convite cancelado.')
  await page.goto('/companies')
  await page.getByRole('button', { name: 'Sair', exact: true }).click()
  await createLocalAccount(page, email, invitation.pathname + invitation.search)
  await expect(page.getByRole('alert')).toHaveText(/convite não está disponível/)
  await expect(page.getByRole('button', { name: /Aceitar convite de/ })).toHaveCount(0)
  await expect(page.getByText('Seu espaço começa aqui')).toBeVisible()
})
