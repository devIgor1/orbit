import { expect, test } from '@playwright/test'
import { localCredentials, openWorkspace } from './local-session'

const workspaceId = 'a0b17000-0000-4000-8000-000000000001'
const initialState = `account.${'a'.repeat(64)}`
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
    if (body.action === 'connect-account') {
      expect(body).toEqual({ action: 'connect-account', workspaceId })
      return route.fulfill({ json: { url: installationUrl } })
    }
    if (body.action === 'installation-callback') {
      expect(body).toEqual({ action: 'installation-callback', state: initialState, installationId: 20 })
      return route.fulfill({ json: { url: authorizationUrl } })
    }
    expect(body).toEqual({ action: 'account-callback', state: oauthState, code: 'test-code' })
    connected = true
    return route.fulfill({ json: { workspaceId, repositoryCount: 1, accountLogin: 'orbit-test', skippedCount: 0 } })
  })
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
    'connect-account',
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
