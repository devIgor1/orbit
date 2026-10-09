import { expect, type Page } from '@playwright/test'
import { z } from 'zod'

const messagesSchema = z.object({
  messages: z.array(z.object({ ID: z.string(), To: z.array(z.object({ Address: z.string() })) })),
})
const messageSchema = z.object({ HTML: z.string() })

export async function createLocalAccount(page: Page, email: string, destination = '/onboarding', name = 'Pessoa de teste Orbit') {
  await page.goto(`/signup?next=${encodeURIComponent(destination)}`)
  await page.getByLabel('Nome completo', { exact: true }).fill(name)
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill('Orbit-test-password-2026!')
  await page.getByLabel('Confirmar senha', { exact: true }).fill('Orbit-test-password-2026!')
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Confira seu e-mail' }).or(page.getByLabel('Nome da empresa')),
  ).toBeVisible()
  if (await page.getByRole('heading', { name: 'Confira seu e-mail' }).isVisible()) {
    let messageId = ''
    await expect
      .poll(async () => {
        const response = await page.request.get('http://127.0.0.1:55524/api/v1/messages')
        const inbox = messagesSchema.parse(await response.json())
        messageId =
          inbox.messages.find((message) => message.To.some((recipient) => recipient.Address === email))?.ID ?? ''
        return messageId
      })
      .not.toBe('')
    const response = await page.request.get(`http://127.0.0.1:55524/api/v1/message/${messageId}`)
    const message = messageSchema.parse(await response.json())
    const link = /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(message.HTML)?.[1].replaceAll('&amp;', '&')
    if (!link || !['127.0.0.1', 'localhost'].includes(new URL(link).hostname))
      throw new Error('Expected a local confirmation link')
    expect(new URL(new URL(link).searchParams.get('redirect_to')!).pathname).toBe('/auth/confirm')
    await page.addInitScript(() => {
      new MutationObserver(() => {
        if (document.getElementById('login-password')) document.documentElement.dataset.loginFormShown = 'true'
      }).observe(document, { childList: true, subtree: true })
    })
    await page.goto(link)
  }
  const expectedPath = new URL(destination, 'http://127.0.0.1:5174').searchParams.has('invitation') ? '/companies' : '/onboarding'
  await expect(page).toHaveURL((url) => url.pathname === expectedPath)
  await expect(page.getByLabel('Nome da empresa')).toBeVisible()
  expect(await page.locator('html').getAttribute('data-login-form-shown')).not.toBe('true')
}

export async function createLocalCompany(page: Page, name: string) {
  const onboarding = new URL(page.url()).pathname === '/onboarding'
  await page.getByLabel('Nome da empresa').fill(name)
  await page.getByRole('button', { name: 'Cadastrar empresa', exact: true }).click()
  if (onboarding) {
    await expect(page.getByRole('heading', { name: 'Crie junto com sua equipe.' })).toBeVisible()
    await page.getByRole('button', { name: 'Ir para o workspace' }).click()
  }
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible()
}

export async function createLocalInvitation(page: Page, email: string) {
  await page.goto('/team')
  await page.getByRole('button', { name: 'Convidar colaborador' }).click()
  await page.getByLabel('E-mail do colaborador').fill(email)
  await page.getByRole('button', { name: 'Gerar só o link', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(/Convite criado/)
  return new URL(await page.getByLabel('Link do convite').inputValue())
}
