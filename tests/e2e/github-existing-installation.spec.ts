import { expect, test } from '@playwright/test'
import { localCredentials, openWorkspace } from './local-session'

const workspaceId = 'a0b17000-0000-4000-8000-000000000001'
const discoveryState = `discover.${'d'.repeat(64)}`
const choiceState = `choice.${'c'.repeat(64)}`
const accountState = `account.${'a'.repeat(64)}`
const selectionState = `selection.${'s'.repeat(64)}`
const finalState = `repositories.${'r'.repeat(64)}`
const oauth = (state: string) => `https://github.com/login/oauth/authorize?client_id=fixture&state=${state}`
const installations = [
  { id: 20, accountLogin: 'devIgor1', accountType: 'User' },
  { id: 30, accountLogin: 'organization-with-a-long-name-for-mobile', accountType: 'Organization' },
]
test.beforeEach(async () => test.skip(!(await localCredentials()), 'Requer Supabase local.'))

for (const count of [1, 2]) {
  test(`retoma instalação existente entre ${count} conta(s), sem alterar repositórios`, async ({ page }, testInfo) => {
    const actions: string[] = []
    let releaseChoice!: () => void
    const choiceWait = new Promise<void>((resolve) => {
      releaseChoice = resolve
    })
    await page.route('https://github.com/**', (route) => {
      const url = new URL(route.request().url())
      expect(url.pathname).toBe('/login/oauth/authorize')
      return route.fulfill({
        status: 302,
        headers: {
          location: `${testInfo.project.use.baseURL}/settings/github/callback?code=test-code&state=${url.searchParams.get('state')}`,
        },
      })
    })
    await page.route('**/functions/v1/github-api', async (route) => {
      const body = route.request().postDataJSON()
      actions.push(body.action)
      if (body.action === 'config')
        return route.fulfill({
          json: {
            configured: true,
            installationUrl: 'https://github.com/apps/orbit-test/installations/new',
            callbackUrl: 'https://example.test/settings/github/callback',
          },
        })
      if (body.action === 'discover-account') return route.fulfill({ json: { url: oauth(discoveryState) } })
      if (body.action === 'discovery-callback') {
        expect(body).toEqual({ action: 'discovery-callback', state: discoveryState, code: 'test-code' })
        return route.fulfill({
          json: { status: 'choose', state: choiceState, installations: installations.slice(0, count) },
        })
      }
      if (body.action === 'select-installation') {
        expect(body).toEqual({ action: 'select-installation', state: choiceState, installationId: 20 })
        await choiceWait
        return route.fulfill({ json: { url: oauth(accountState) } })
      }
      if (body.action === 'prepare-repositories')
        return route.fulfill({
          json: {
            status: 'repositories',
            state: selectionState,
            accountLogin: 'devIgor1',
            skippedCount: 0,
            repositories: [
              { id: 10, fullName: 'devIgor1/orbit', isPrivate: true, connected: false, inUse: false },
              { id: 11, fullName: 'devIgor1/another', isPrivate: true, connected: false, inUse: false },
            ],
          },
        })
      if (body.action === 'select-repositories') {
        expect(body.repositoryIds).toEqual([10])
        return route.fulfill({ json: { url: oauth(finalState) } })
      }
      expect(body).toEqual({ action: 'repositories-callback', state: finalState, code: 'test-code' })
      return route.fulfill({ json: { workspaceId, repositoryCount: 1, accountLogin: 'devIgor1', skippedCount: 0 } })
    })
    await openWorkspace(page, '/settings')
    await page.getByRole('button', { name: 'Conectar GitHub', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Escolha a conta para conectar' })).toBeVisible()
    await expect(page.getByRole('list', { name: 'Contas do GitHub disponíveis' }).getByRole('listitem')).toHaveCount(
      count,
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('github-account-choice.png') })
    if (testInfo.project.name === 'desktop' && count === 2) {
      await page.setViewportSize({ width: 820, height: 1180 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: testInfo.outputPath('github-account-choice-tablet.png') })
    }
    const connect = page.getByRole('button', { name: 'Conectar devIgor1' })
    await connect.focus()
    await page.keyboard.press('Enter')
    await expect(connect).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Conectar outra conta ou organização' })).toBeDisabled()
    releaseChoice()
    await expect(page.getByRole('button', { name: 'Salvar seleção' })).toBeDisabled()
    await expect(page.getByRole('checkbox', { name: 'devIgor1/orbit', exact: true })).not.toBeChecked()
    await page.getByRole('checkbox', { name: 'devIgor1/orbit', exact: true }).check()
    await page.getByRole('button', { name: 'Salvar seleção' }).click()
    await expect(page.getByRole('status')).toContainText('GitHub conectado: devIgor1')
    await expect(page.getByRole('status')).toContainText('1 repositório disponível')
    expect(actions.filter((action) => action !== 'config')).toEqual([
      'discover-account',
      'discovery-callback',
      'select-installation',
      'prepare-repositories',
      'select-repositories',
      'repositories-callback',
    ])
    await expect(page).toHaveURL(/\/settings\/github\/callback$/)
  })
}

test('escolha expirada mostra recuperação e impede reenvio', async ({ page }) => {
  let attempts = 0
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'discovery-callback')
      return route.fulfill({ json: { status: 'choose', state: choiceState, installations } })
    expect(body.action).toBe('select-installation')
    attempts++
    return route.fulfill({ status: 400, json: { code: 'GITHUB_STATE_INVALID' } })
  })
  await openWorkspace(page, '/dashboard')
  await page.goto(`/settings/github/callback?state=${discoveryState}&code=code`)
  const connect = page.getByRole('button', { name: 'Conectar devIgor1' })
  await connect.click()
  await expect(page.getByRole('alert')).toContainText('Esta tentativa de conexão expirou')
  await expect(connect).toBeDisabled()
  await expect(page.getByRole('link', { name: 'Voltar às configurações' })).toBeVisible()
  expect(attempts).toBe(1)
})

test('outra conta inicia instalação com estado novo', async ({ page }) => {
  const installUrl = `https://github.com/apps/orbit-test/installations/new?state=${accountState}`
  await page.route(installUrl, (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<main><h1>Escolher nova conta no GitHub</h1></main>',
    }),
  )
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'discovery-callback')
      return route.fulfill({ json: { status: 'choose', state: choiceState, installations } })
    expect(body).toEqual({ action: 'select-installation', state: choiceState, installationId: null })
    return route.fulfill({ json: { url: installUrl } })
  })
  await openWorkspace(page, '/dashboard')
  await page.goto(`/settings/github/callback?state=${discoveryState}&code=code`)
  await page.getByRole('button', { name: 'Conectar outra conta ou organização' }).click()
  await expect(page.getByRole('heading', { name: 'Escolher nova conta no GitHub' })).toBeVisible()
  await expect(page).toHaveURL(installUrl)
})
