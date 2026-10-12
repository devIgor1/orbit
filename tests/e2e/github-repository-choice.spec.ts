import { expect, test } from '@playwright/test'
import { localCredentials, openWorkspace } from './local-session'

const accountState = `account.${'a'.repeat(64)}`
const choiceState = `selection.${'c'.repeat(64)}`
const finalState = `repositories.${'r'.repeat(64)}`
const repositories = [
  { id: 10, fullName: 'devIgor1/em-uso', isPrivate: true, connected: true, inUse: true },
  { id: 11, fullName: 'devIgor1/importado-antes', isPrivate: true, connected: true, inUse: false },
  {
    id: 12,
    fullName: 'devIgor1/repositorio-novo-com-nome-bastante-longo-para-celular',
    isPrivate: false,
    connected: false,
    inUse: false,
  },
]
test.beforeEach(async () => test.skip(!(await localCredentials()), 'Requer Supabase local.'))

test('revisa conexões anteriores, preserva projetos e salva somente a seleção visível e filtrada', async ({
  page,
}, testInfo) => {
  const actions: string[] = []
  const url = `https://github.com/login/oauth/authorize?client_id=fixture&state=${finalState}`
  await page.route(url, (route) =>
    route.fulfill({
      status: 302,
      headers: { location: `${testInfo.project.use.baseURL}/settings/github/callback?code=code&state=${finalState}` },
    }),
  )
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    actions.push(body.action)
    if (body.action === 'prepare-repositories')
      return route.fulfill({
        json: { status: 'repositories', state: choiceState, accountLogin: 'devIgor1', skippedCount: 0, repositories },
      })
    if (body.action === 'select-repositories') {
      expect(body).toEqual({ action: 'select-repositories', state: choiceState, repositoryIds: [10, 12] })
      return route.fulfill({ json: { url } })
    }
    expect(body.action).toBe('repositories-callback')
    return route.fulfill({
      json: {
        workspaceId: 'a0b17000-0000-4000-8000-000000000001',
        accountLogin: 'devIgor1',
        repositoryCount: 2,
        skippedCount: 0,
      },
    })
  })
  await openWorkspace(page, '/dashboard')
  await page.goto(`/settings/github/callback?state=${accountState}&code=code`)
  const used = page.getByRole('checkbox', { name: repositories[0].fullName, exact: true })
  await expect(used).toBeChecked()
  await expect(used).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: repositories[1].fullName, exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: repositories[2].fullName, exact: true })).not.toBeChecked()
  await page.getByRole('button', { name: 'Limpar seleção' }).click()
  await expect(used).toBeChecked()
  await expect(page.getByText('1 selecionado · 1 será desconectado')).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar repositórios' }).fill('novo')
  await expect(page.getByRole('checkbox')).toHaveCount(1)
  await page.getByRole('checkbox', { name: repositories[2].fullName, exact: true }).focus()
  await page.keyboard.press('Space')
  await page.getByRole('textbox', { name: 'Buscar repositórios' }).fill('nao-existe')
  await expect(page.getByText('Nenhum repositório corresponde à busca.')).toBeVisible()
  await page.getByRole('textbox', { name: 'Buscar repositórios' }).clear()
  await expect(page.getByText('2 selecionados · 1 será desconectado')).toBeVisible()
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 320, height: 900 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('repository-selection.png'), fullPage: true })
  await page.getByRole('button', { name: 'Salvar seleção' }).click()
  await expect(page.getByRole('status')).toContainText('2 repositórios disponíveis')
  expect(actions).toEqual(['prepare-repositories', 'select-repositories', 'repositories-callback'])
})

test('seleção recusada mantém escolhas e erro, sem sucesso artificial', async ({ page }) => {
  let saves = 0
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'prepare-repositories')
      return route.fulfill({
        json: { status: 'repositories', state: choiceState, accountLogin: 'devIgor1', skippedCount: 0, repositories },
      })
    expect(body.action).toBe('select-repositories')
    saves++
    return route.fulfill({ status: 400, json: { code: 'GITHUB_STATE_INVALID' } })
  })
  await openWorkspace(page, '/dashboard')
  await page.goto(`/settings/github/callback?state=${accountState}&code=code`)
  await page.getByRole('button', { name: 'Limpar seleção' }).click()
  await page.getByRole('button', { name: 'Salvar seleção' }).click()
  await expect(page.getByRole('alert')).toContainText('Esta tentativa de conexão expirou')
  await expect(page.getByRole('button', { name: 'Salvar seleção' })).toBeDisabled()
  await expect(page.getByRole('checkbox', { name: repositories[0].fullName, exact: true })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: repositories[1].fullName, exact: true })).not.toBeChecked()
  expect(saves).toBe(1)
})
