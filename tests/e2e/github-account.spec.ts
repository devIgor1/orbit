import { expect, test } from '@playwright/test'
import { localCredentials, openWorkspace } from './local-session'

const workspaceId = 'a0b17000-0000-4000-8000-000000000001'
const initialState = `account.${'a'.repeat(64)}`
const discoveryState = `discover.${'d'.repeat(64)}`
const discoveryUrl = `https://github.com/login/oauth/authorize?client_id=fixture&state=${discoveryState}`
const oauthState = `account.${'b'.repeat(64)}`
const installationUrl = `https://github.com/apps/orbit-test/installations/new?state=${initialState}`
const authorizationUrl = `https://github.com/login/oauth/authorize?client_id=fixture&state=${oauthState}`
test.beforeEach(async () => test.skip(!(await localCredentials()), 'Requer Supabase local.'))

test('conecta em um fluxo contínuo e importa os repositórios autorizados', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const actions: string[] = []
  let connected = false
  await page.route('**/rest/v1/github_repositories?*', (route) =>
    route.fulfill({
      json: connected
        ? [
            {
              id: 'ad000000-0000-4000-8000-000000000001',
              workspace_id: workspaceId,
              github_id: 10,
              installation_id: 20,
              full_name: 'orbit-test/entregas',
              default_branch: 'main',
              is_private: true,
              active: true,
            },
          ]
        : [],
    }),
  )
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    actions.push(body.action)
    if (body.action === 'config')
      return route.fulfill({
        json: {
          configured: true,
          installationUrl: installationUrl.split('?')[0],
          callbackUrl: 'https://example.test/settings/github/callback',
        },
      })
    if (body.action === 'discover-account') {
      expect(body).toEqual({ action: 'discover-account', workspaceId })
      return route.fulfill({ json: { url: discoveryUrl } })
    }
    if (body.action === 'discovery-callback') {
      expect(body).toEqual({ action: 'discovery-callback', state: discoveryState, code: 'discovery-code' })
      return route.fulfill({ json: { status: 'redirect', url: installationUrl } })
    }
    if (body.action === 'installation-callback') {
      expect(body).toEqual({ action: 'installation-callback', state: initialState, installationId: 20 })
      return route.fulfill({ json: { url: authorizationUrl } })
    }
    expect(body).toEqual({ action: 'account-callback', state: oauthState, code: 'test-code' })
    connected = true
    return route.fulfill({ json: { workspaceId, repositoryCount: 1, accountLogin: 'orbit-test', skippedCount: 0 } })
  })
  await page.route(discoveryUrl, (route) =>
    route.fulfill({
      status: 302,
      headers: {
        location: `${testInfo.project.use.baseURL}/settings/github/callback?code=discovery-code&state=${discoveryState}`,
      },
    }),
  )
  // Simulate GitHub consent and OAuth only; no real installation or external write.
  await page.route(installationUrl, (route) =>
    route.fulfill({
      status: 302,
      headers: {
        location: `${testInfo.project.use.baseURL}/settings?installation_id=20&setup_action=install&state=${initialState}`,
      },
    }),
  )
  await page.route(authorizationUrl, (route) =>
    route.fulfill({
      status: 302,
      headers: {
        location: `${testInfo.project.use.baseURL}/settings/github/callback?code=test-code&state=${oauthState}`,
      },
    }),
  )
  await openWorkspace(page, '/settings')
  const section = page.getByRole('region', { name: 'GitHub', exact: true })
  await expect(section.getByRole('button', { name: 'Conectar GitHub' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await section.screenshot({ path: testInfo.outputPath('github-connect.png') })
  await section.getByRole('button', { name: 'Conectar GitHub' }).click()
  await expect(page.getByRole('status')).toContainText('GitHub conectado: orbit-test', { timeout: 20_000 })
  await expect(page.getByRole('status')).toContainText('1 repositório disponível')
  await expect(page).toHaveURL(/\/settings\/github\/callback$/)
  expect(actions.filter((action) => action !== 'config')).toEqual([
    'discover-account',
    'discovery-callback',
    'installation-callback',
    'account-callback',
  ])
  await page.getByRole('link', { name: 'Voltar às configurações' }).click()
  await expect(page.getByText('orbit-test/entregas', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 820, height: 1180 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await section.screenshot({ path: testInfo.outputPath('github-connected-tablet.png') })
  }
})

test('pedido aguardando aprovação e autorização cancelada mostram o próximo passo', async ({ page }) => {
  let requests = 0
  await page.route('**/functions/v1/github-api', (route) => {
    requests++
    return route.fulfill({ status: 500, json: { code: 'GITHUB_FAILED' } })
  })
  await openWorkspace(page, '/dashboard')
  await page.goto(`/settings?setup_action=request&state=${initialState}`)
  await expect(page.getByRole('alert')).toContainText('Após a aprovação')
  await page.goto(`/settings/github/callback?error=access_denied&state=${oauthState}`)
  await expect(page.getByRole('alert')).toContainText('A autorização não foi concluída')
  expect(requests).toBe(0)
})

test('expiração explica como reiniciar sem reenviar a callback antiga', async ({ page }, testInfo) => {
  const freshState = `discover.${'c'.repeat(64)}`
  const freshUrl = `https://github.com/login/oauth/authorize?client_id=fixture&state=${freshState}`
  let expiredCallbacks = 0
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    if (body.action === 'config')
      return route.fulfill({
        json: {
          configured: true,
          installationUrl: installationUrl.split('?')[0],
          callbackUrl: 'https://example.test/settings/github/callback',
        },
      })
    if (body.action === 'discover-account') return route.fulfill({ json: { url: freshUrl } })
    expect(body).toEqual({ action: 'installation-callback', state: initialState, installationId: 20 })
    expiredCallbacks++
    return route.fulfill({ status: 400, json: { code: 'GITHUB_STATE_INVALID' } })
  })
  await page.route(freshUrl, (route) =>
    route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<main><h1>Autorizar nova conexão</h1></main>' }),
  )
  await openWorkspace(page, '/dashboard')
  await page.goto(`/settings?installation_id=20&setup_action=update&state=${initialState}`)
  await expect(page.getByRole('alert')).toContainText('Esta tentativa de conexão expirou ou já foi utilizada')
  await expect(page.getByRole('alert')).toContainText('clique em Conectar GitHub')
  await page.screenshot({ path: testInfo.outputPath('github-expired-connection.png') })
  await page.getByRole('link', { name: 'Voltar às configurações' }).click()
  await page.getByRole('button', { name: 'Conectar GitHub', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Autorizar nova conexão' })).toBeVisible()
  await expect(page).toHaveURL(freshUrl)
  expect(expiredCallbacks).toBe(1)
})
