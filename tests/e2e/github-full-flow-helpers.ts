import { expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/supabase/database.generated'
import { localBackend } from '../support/local-backend'
import { openWorkspace } from './local-session'

export const workspaceId = 'a0b17000-0000-4000-8000-000000000001'
export const fixtureUrl = 'http://127.0.0.1:55530'
export async function fixture(page: Page, path: string, data: object = {}) {
  const response = await page.request.post(`${fixtureUrl}/__test/${path}`, { data })
  expect(response.ok(), await response.text()).toBe(true)
  return response.json()
}
export async function database() {
  const config = await localBackend()
  return createClient<Database>(config.API_URL, config.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
export async function must<T>({ data, error }: { data: T; error: unknown }) {
  if (error) throw error
  return data
}
export async function connectRepositories(page: Page, baseURL: string) {
  // Only the external consent screen is simulated. Each callback runs the real Edge handler.
  await page.route('https://github.com/**', (route) => {
    const url = new URL(route.request().url())
    expect(url.pathname).toBe('/login/oauth/authorize')
    return route.fulfill({
      status: 302,
      headers: {
        location: `${baseURL}/settings/github/callback?code=fixture-code&state=${url.searchParams.get('state')}`,
      },
    })
  })
  await openWorkspace(page, '/settings')
  await page.getByRole('button', { name: 'Conectar GitHub', exact: true }).click()
  await page.getByRole('button', { name: 'Conectar orbit-test', exact: true }).click()
  const first = page.getByRole('checkbox', { name: 'orbit-test/entregas', exact: true })
  await first.check()
  await page.getByRole('checkbox', { name: 'orbit-test/segundo-repo', exact: true }).check()
  await page.getByRole('button', { name: 'Salvar seleção' }).click()
  await expect(page.getByRole('status')).toContainText('2 repositórios disponíveis')
}
export async function createProject(page: Page, title: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: 'Novo projeto', exact: true }).click()
  await page.getByLabel('Nome do projeto').fill(title)
  await page.getByRole('button', { name: 'Criar projeto', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('link', { name: title, exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/)
  return new URL(page.url()).pathname.split('/').at(-1)!
}
export async function createTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
  await page.getByLabel('Nome da tarefa').fill(title)
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await openTask(page, title)
}
export async function openTask(page: Page, title: string) {
  await page.getByRole('button', { name: title, exact: true }).click()
  await page.getByRole('button', { name: 'Desenvolvimento', exact: true }).click()
}
export async function setProjectRepository(page: Page, repository = 'orbit-test/entregas') {
  const card = page.locator('.project-repository')
  await card.getByRole('combobox').click()
  await page.getByRole('option', { name: repository, exact: true }).click()
  await expect(card.getByRole('link', { name: repository, exact: true })).toBeVisible()
}
export async function linkPR(page: Page, repository = 'orbit-test/entregas') {
  await expect(page.getByRole('dialog').getByText(repository, { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Pull request', exact: true }).click()
  await page.getByRole('option', { name: /#42.*Entrega do fluxo completo/ }).click()
  await page.getByRole('button', { name: 'Vincular PR à tarefa' }).click()
  await expect(page.getByText('Sincronização agendada.', { exact: false })).toBeVisible()
}
export async function pullEvent(page: Page, state: string, repository = 10) {
  await fixture(page, 'github', { state })
  return fixture(page, 'event', {
    name: 'pull_request',
    body: {
      action: 'synchronize',
      installation: { id: 20 },
      repository: { id: repository },
      pull_request: { number: 42, head: { ref: 'feat/entrega', repo: { id: repository } } },
    },
  })
}
export async function refreshTask(page: Page, title: string) {
  await page.reload()
  await openTask(page, title)
}
