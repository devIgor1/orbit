import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { createLocalAccount, createLocalCompany } from './onboarding-helpers'

test.beforeAll(async () => {
  const env = await readFile('.env.docker.local', 'utf8')
  if (!/^VITE_SUPABASE_URL=http:\/\/(?:127\.0\.0\.1|localhost):55521\/?\s*$/m.test(env))
    throw new Error('Email E2E requires the isolated local Supabase environment')
})

test('envia um convite pelo backend, persiste o resultado e limita o reenvio', async ({ page, browser }, testInfo) => {
  test.skip(process.env.ORBIT_EMAIL_E2E !== '1', 'Requer função local e Resend configurado; usa somente o simulador resend.dev.')
  const suffix = randomUUID()
  const recipient = `delivered+orbit-invite-${suffix}@resend.dev`
  const company = `Empresa e-mail ${suffix.slice(0, 8)}`
  const backendRequests: string[] = []
  page.on('request', (request) => { if (/\/rest\/v1\/|\/auth\/v1\/|\/functions\/v1\//.test(request.url())) backendRequests.push(request.url()) })
  await createLocalAccount(page, `mail-owner-${suffix}@example.test`)
  await createLocalCompany(page, company)
  await page.goto('/team')
  await page.getByRole('button', { name: 'Convidar colaborador' }).click()
  await page.getByLabel('E-mail do colaborador').fill(recipient)
  await page.getByRole('button', { name: 'Enviar convite', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(`Convite enviado por e-mail para ${recipient}.`)
  const link = new URL(await page.getByLabel('Link do convite').inputValue())
  await expect(page.getByText('E-mail enviado', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('invitation-email-sent.png'), fullPage: true })
  await page.getByRole('button', { name: `Reenviar e-mail para ${recipient}` }).click()
  await expect(page.getByRole('alert')).toHaveText(/um minuto/)
  await expect(page.getByRole('status')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Convidar colaborador' }).click()
  await expect(page.getByText('E-mail enviado', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(backendRequests.length).toBeGreaterThan(0)
  expect(backendRequests.every((url) => new URL(url).port === '55521')).toBe(true)
  const context = await browser.newContext({ ...testInfo.project.use, baseURL: 'http://127.0.0.1:5174' })
  try {
    const collaborator = await context.newPage()
    await createLocalAccount(collaborator, recipient, link.pathname + link.search)
    await collaborator.getByRole('button', { name: `Aceitar convite de ${company}` }).click()
    await expect(collaborator).toHaveURL(/\/dashboard$/)
  } finally {
    await context.close()
  }
})
