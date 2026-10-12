import { expect, test, type Page } from '@playwright/test'
import { localCredentials, openWorkspace } from './local-session'

const projectId = 'b0b17000-0000-4000-8000-000000000001'
const workspaceId = 'a0b17000-0000-4000-8000-000000000001'
const repositoryId = 'ad000000-0000-4000-8000-000000000001'
const linkId = 'ad000000-0000-4000-8000-000000000002'
const branch = 'feat/entrega-com-nome-longo-para-conferir-a-selecao-e-a-responsividade'
const title = 'Entrega de identidade visual com nome longo para conferir a leitura do pull request'

// GitHub endpoints are simulated; authentication/projects/tasks use local Supabase.
async function prepare(page: Page, failFirst = false) {
  let linked: object | null = null
  let fail = failFirst
  const submissions: Record<string, unknown>[] = []
  await page.route('**/rest/v1/github_repositories?*', (route) =>
    route.fulfill({
      json: [
        {
          id: repositoryId,
          workspace_id: workspaceId,
          github_id: 10,
          installation_id: 20,
          full_name: 'orbit-test/projeto',
          default_branch: 'main',
          active: true,
          is_private: true,
        },
      ],
    }),
  )
  await page.route('**/rest/v1/project_github_repositories?*', (route) =>
    route.fulfill({
      json: {
        workspace_id: workspaceId,
        project_id: projectId,
        repository_id: repositoryId,
      },
    }),
  )
  await page.route('**/rest/v1/task_github_links?*', (route) => route.fulfill({ json: linked }))
  await page.route('**/functions/v1/github-api', (route) => {
    const body = route.request().postDataJSON()
    expect(body.workspaceId).toBe(workspaceId)
    expect(body.repositoryId).toBe(repositoryId)
    expect(body.taskId).toMatch(/^[0-9a-f-]{36}$/)
    if (body.action === 'references') {
      if (fail) {
        fail = false
        return route.fulfill({ status: 403, json: { code: 'GITHUB_UNAVAILABLE' } })
      }
      if (body.kind === 'branch')
        return route.fulfill({
          json:
            body.page === 1
              ? {
                  kind: 'branch',
                  items: [{ name: 'feat/primeira' }],
                  nextPage: 2,
                }
              : { kind: 'branch', items: [{ name: branch }], nextPage: null },
        })
      return route.fulfill({
        json: {
          kind: 'pr',
          nextPage: null,
          items:
            body.state === 'closed'
              ? [
                  {
                    number: 55,
                    title,
                    branch,
                    baseBranch: 'main',
                    headRepository: 'contributor/fork',
                    state: 'merged',
                  },
                ]
              : [{ number: 42, title, branch, baseBranch: 'main', headRepository: 'contributor/fork', state: 'draft' }],
        },
      })
    }
    expect(body.action).toBe('link')
    submissions.push(body)
    linked = {
      id: linkId,
      task_id: body.taskId,
      workspace_id: workspaceId,
      project_id: projectId,
      repository_id: repositoryId,
      branch: body.branch ?? branch,
      head_repository_id: body.prNumber ? 99 : 10,
      pr_number: body.prNumber ?? null,
      pr_title: body.prNumber ? title : null,
      pr_state: body.prNumber ? 'open' : 'branch',
      sync_status: 'pending',
      comment_status: 'not_due',
      last_synced_at: null,
      comment_id: null,
    }
    return route.fulfill({ json: { id: linkId } })
  })
  await openWorkspace(page, `/projects/${projectId}`)
  await page.locator('.task-card-title').first().click()
  await page.getByRole('button', { name: 'Desenvolvimento', exact: true }).click()
  return { submissions, dialog: page.getByRole('dialog') }
}
test.beforeEach(async () => test.skip(!(await localCredentials()), 'Requer Supabase local.'))

test('seleciona uma branch paginada por teclado e envia a referência correta', async ({ page }, testInfo) => {
  const { dialog, submissions } = await prepare(page)
  await expect(dialog.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Carregar mais opções' }).click()
  await expect(dialog.getByText('2 branches carregadas')).toBeVisible()
  const select = dialog.getByRole('combobox', { name: 'Branch de trabalho' })
  await select.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('option', { name: branch })).toBeVisible()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await expect(select).toContainText(branch)
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('github-branch-selection.png') })
  await dialog.getByRole('button', { name: 'Vincular à tarefa' }).click()
  await expect(dialog.getByRole('button', { name: 'Remover vínculo' })).toBeVisible()
  expect(submissions).toEqual([expect.objectContaining({ branch, repositoryId })])
  expect(submissions[0]).not.toHaveProperty('prNumber')
})

test('lista PRs com status e forks, filtra e seleciona um PR integrado', async ({ page }, testInfo) => {
  const { dialog, submissions } = await prepare(page)
  await dialog.getByRole('combobox', { name: 'Vincular por' }).click()
  await page.getByRole('option', { name: 'Pull request', exact: true }).click()
  await dialog.getByRole('combobox', { name: 'Pull request', exact: true }).click()
  await expect(page.getByRole('option', { name: /#42.*Rascunho/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('github-pr-options.png'), animations: 'disabled' })
  await page.getByRole('option', { name: /#42.*Rascunho/ }).click()
  await expect(dialog.getByText(/contributor\/fork:/)).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Status dos PRs' }).click()
  await page.getByRole('option', { name: 'Fechados e integrados' }).click()
  await expect(dialog.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await dialog.getByLabel('Filtrar PRs carregados').fill('55')
  await dialog.getByRole('combobox', { name: 'Pull request', exact: true }).click()
  await page.getByRole('option', { name: /#55.*Integrado/ }).click()
  await expect(dialog.getByText(/Este PR já foi integrado/)).toBeVisible()
  await page.setViewportSize(
    testInfo.project.name === 'desktop' ? { width: 820, height: 1180 } : { width: 320, height: 568 },
  )
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  await dialog.getByRole('button', { name: 'Vincular à tarefa' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('github-pr-selection-responsive.png'), animations: 'disabled' })
  await dialog.getByRole('button', { name: 'Vincular à tarefa' }).click()
  await expect(dialog.getByRole('button', { name: 'Remover vínculo' })).toBeVisible()
  expect(submissions).toEqual([expect.objectContaining({ prNumber: 55, repositoryId })])
  expect(submissions[0]).not.toHaveProperty('branch')
})

test('mostra erro de acesso e permite consultar novamente sem tratar a falha como vazio', async ({ page }) => {
  const { dialog } = await prepare(page, true)
  await expect(dialog.getByRole('alert')).toContainText('não está disponível')
  await expect(dialog.getByText('Nenhuma branch de trabalho')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Tentar novamente' }).click()
  await dialog.getByRole('combobox', { name: 'Branch de trabalho' }).click()
  await expect(page.getByRole('option', { name: 'feat/primeira' })).toBeVisible()
})
