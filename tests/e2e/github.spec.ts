import { expect, test, type Page } from '@playwright/test'
import { localCredentials, openWorkspace } from './local-session'

// Only tests simulate GitHub responses. The application still reads real local
// Supabase users, projects and tasks; no production data or external writes.
const projectId = 'b0b17000-0000-4000-8000-000000000001'
const workspaceId = 'a0b17000-0000-4000-8000-000000000001'
const repo = { id: 'ad000000-0000-4000-8000-000000000001',workspace_id: workspaceId,github_id: 10,installation_id: 20,
  full_name: 'orbit-test/repositorio-com-nome-longo-para-validar-responsividade',default_branch: 'main',is_private: true,active: true }
async function mockIntegration(page: Page, configured = true) {
  await page.route('**/rest/v1/github_repositories?*',route => route.fulfill({ json: [repo] }))
  await page.route('**/rest/v1/project_github_repositories?*',route => route.fulfill({ json: { project_id: projectId,workspace_id: workspaceId,repository_id: repo.id } }))
  await page.route('**/rest/v1/task_github_links?*',route => route.fulfill({ json: null }))
  await page.route('**/functions/v1/github-api',route => {
    const body = route.request().postDataJSON()
    if (body.action === 'references') return route.fulfill({ json: body.kind === 'branch'
      ? { kind: 'branch',items: [{ name: 'feat/login' }],nextPage: null }
      : { kind: 'pr',items: [{ number: 42,title: 'Login',branch: 'feat/login',baseBranch: 'main',headRepository: 'orbit-test/repo',state: 'open' }],nextPage: null } })
    return body.action === 'config' ? route.fulfill({ json: configured ? { configured: true,installationUrl: 'https://github.com/apps/orbit-test/installations/new',callbackUrl: 'https://example.test/settings/github/callback' } : { configured: false } }) :
      route.fulfill({ status: 403,json: { code: 'GITHUB_UNAVAILABLE' } })
  })
}
test.beforeEach(async () => test.skip(!(await localCredentials()),'Requer Supabase local.'))
test('configuração oferece uma única conexão e permite tentar novamente em erro',async ({ page },testInfo) => {
  await mockIntegration(page)
  await openWorkspace(page,'/settings')
  await expect(page.getByRole('link',{ name: 'Instalar GitHub App' })).toHaveCount(0)
  await expect(page.getByLabel('Repositório',{ exact: true })).toHaveCount(0)
  const connect = page.getByRole('button',{ name: 'Conectar GitHub' })
  await connect.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('não está disponível')
  await expect(connect).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('github-settings.png'),fullPage: true })
})
test('integração ainda não ativada informa o próximo passo',async ({ page }) => {
  await mockIntegration(page,false)
  await openWorkspace(page,'/settings')
  await expect(page.getByText('A integração GitHub ainda não foi ativada.',{ exact: false })).toBeVisible()
  await expect(page.getByRole('button',{ name: 'Conectar GitHub' })).toHaveCount(0)
})
test('vínculo da tarefa funciona por teclado e mantém a referência quando GitHub recusa',async ({ page },testInfo) => {
  await mockIntegration(page)
  await openWorkspace(page,`/projects/${projectId}`)
  await page.locator('.task-card-title').first().click()
  await page.getByRole('button',{ name: 'Desenvolvimento',exact: true }).click()
  const kind = page.getByRole('combobox',{ name: 'Vincular por' })
  await kind.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('End'); await page.keyboard.press('Enter')
  await page.getByRole('combobox',{ name: 'Pull request',exact: true }).click()
  await page.getByRole('option',{ name: /#42.*Login/ }).click()
  await page.getByRole('button',{ name: 'Vincular à tarefa' }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('não está disponível')
  await expect(page.getByRole('combobox',{ name: 'Pull request',exact: true })).toContainText('#42')
  const dialog = page.getByRole('dialog')
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('github-task.png'),fullPage: true })
})
test('merge confirmado mostra o comentário e mantém layout em desktop, tablet e celular',async ({ page },testInfo) => {
  await mockIntegration(page)
  await page.route('**/rest/v1/task_github_links?*',route => {
    const taskId = new URL(route.request().url()).searchParams.get('task_id')?.replace('eq.','')
    return route.fulfill({ json: { id: 'ad000000-0000-4000-8000-000000000002',task_id: taskId,workspace_id: workspaceId,project_id: projectId,
      repository_id: repo.id,branch: 'feat/entrega-com-nome-longo-para-verificar-a-quebra-do-texto',head_repository_id: 10,
      pr_number: 42,pr_title: 'Entrega confirmada pelo GitHub',pr_state: 'merged',sync_status: 'synced',last_error_code: null,
      last_synced_at: '2026-10-11T12:00:00Z',merged_at: '2026-10-11T12:00:00Z',comment_status: 'sent',comment_id: 123 } })
  })
  await openWorkspace(page,`/projects/${projectId}`)
  await page.locator('.task-card-title').first().click()
  await page.getByRole('button',{ name: 'Desenvolvimento',exact: true }).click()
  await expect(page.getByText('PR integrado',{ exact: true })).toBeVisible()
  await expect(page.getByRole('link',{ name: 'Ver comentário publicado' })).toHaveAttribute('href',`https://github.com/${repo.full_name}/pull/42#issuecomment-123`)
  const dialog = page.getByRole('dialog')
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('github-merged.png') })
  if (testInfo.project.name === 'desktop') {
    await page.setViewportSize({ width: 820,height: 1180 })
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('github-merged-tablet.png') })
  }
})
test('retorno OAuth preserva o contexto ao fazer login e não repete a conexão',async ({ page }) => {
  const credentials = await localCredentials()
  if (!credentials) throw new Error('Local credentials required')
  const depthErrors: string[] = []
  page.on('console',message => { if (message.text().includes('Maximum update depth')) depthErrors.push(message.text()) })
  // Simulate a slow lazy route to catch repeated Navigate effects during login.
  await page.route('**/src/pages/login-page.tsx*',async route => {
    await new Promise(resolve => setTimeout(resolve,300))
    await route.continue()
  })
  let callbacks = 0
  await page.route('**/functions/v1/github-api',route => {
    const body = route.request().postDataJSON()
    expect(body).toEqual({ action: 'callback',state: 'test-state',code: 'test-code' })
    callbacks++
    return route.fulfill({ json: { id: repo.id,workspaceId } })
  })
  await page.goto('/settings/github/callback?state=test-state&code=test-code')
  await page.getByLabel('E-mail',{ exact: true }).fill(credentials.email)
  await page.getByLabel('Senha',{ exact: true }).fill(credentials.password)
  await page.getByRole('button',{ name: 'Entrar no workspace' }).click()
  await expect(page.getByText('GitHub conectado.',{ exact: false })).toBeVisible()
  await expect(page).toHaveURL(/\/settings\/github\/callback$/)
  expect(callbacks).toBe(1)
  expect(depthErrors).toEqual([])
})
