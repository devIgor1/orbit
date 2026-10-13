import { expect, test } from '@playwright/test'
import {
  connectRepositories,
  createProject,
  createTask,
  database,
  fixture,
  fixtureUrl,
  linkPR,
  must,
  openTask,
  pullEvent,
  refreshTask,
  workspaceId,
} from './github-full-flow-helpers'

test.describe('GitHub com Auth, API, worker e banco reais', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(process.env.ORBIT_GITHUB_FLOW_TESTS !== '1', 'Opt-in: requer backend local e github-flow-server.')
  let projectId: string | undefined

  test.beforeEach(async ({ page }, info) => {
    test.setTimeout(90_000)
    expect(process.env.VITE_SUPABASE_URL).toBe(fixtureUrl)
    await fixture(page, 'github', { reset: true })
    await connectRepositories(page, String(info.project.use.baseURL))
    projectId = await createProject(page, `GitHub completo ${info.project.name} ${Date.now()}`)
  })
  test.afterEach(async () => {
    if (!projectId) return
    const db = await database()
    await must(await db.from('projects').delete().eq('id', projectId))
    projectId = undefined
  })

  test('rascunho, revisão, fechamento e merge persistem; comentário incerto se recupera sem duplicação', async ({
    page,
  }, info) => {
    const title = `Entrega completa ${info.project.name}`
    await createTask(page, title)
    await linkPR(page)
    const db = await database()
    const task = await must(
      await db.from('tasks').select('id').eq('project_id', projectId!).eq('title', title).single(),
    )
    const taskId = task!.id
    const taskStatus = async () =>
      (await must(await db.from('tasks').select('status').eq('id', taskId).single()))!.status
    expect(
      await must(await db.from('project_github_repositories').select('project_id').eq('project_id', projectId!)),
    ).toEqual([])
    expect(await fixture(page, 'worker')).toEqual([expect.objectContaining({ ok: true })])
    expect(await taskStatus()).toBe('in_progress')
    // Confirm background polling refreshes both the PR and the task status without reload.
    await expect(page.getByText('PR em rascunho', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('dialog').getByText('Em andamento', { exact: true })).toBeVisible()
    await refreshTask(page, title)
    await expect(page.getByText('PR em rascunho', { exact: true })).toBeVisible()
    for (const [state, status, label] of [
      ['open', 'review', 'PR em revisão'],
      ['closed', 'in_progress', 'PR fechado sem merge'],
      ['open', 'review', 'PR em revisão'],
    ]) {
      await pullEvent(page, state)
      expect(await fixture(page, 'worker')).toEqual([expect.objectContaining({ ok: true })])
      expect(await taskStatus()).toBe(status)
      await refreshTask(page, title)
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }
    expect((await (await page.request.get(`${fixtureUrl}/__test/github`)).json()).comments).toEqual([])
    await fixture(page, 'github', { uncertainComment: true })
    await pullEvent(page, 'merged')
    expect(await fixture(page, 'worker')).toEqual([expect.objectContaining({ ok: false })])
    expect(await taskStatus()).toBe('done')
    await refreshTask(page, title)
    await expect(page.getByText('Falha ao publicar o comentário.', { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Sincronizar', exact: true }).click()
    await expect(page.getByText('Sincronização agendada.', { exact: false })).toBeVisible()
    // Two concurrent workers cannot send twice for the same lease.
    const runs = await Promise.all([fixture(page, 'worker'), fixture(page, 'worker')])
    expect(runs.flat()).toEqual([expect.objectContaining({ ok: true })])
    await refreshTask(page, title)
    await expect(page.getByText('PR integrado', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver comentário publicado' })).toHaveAttribute(
      'href',
      /pull\/42#issuecomment-123$/,
    )
    const snapshot = await (await page.request.get(`${fixtureUrl}/__test/github`)).json()
    expect(snapshot.comments).toHaveLength(1)
    expect(snapshot.comments[0].body).toContain(title)
    expect(snapshot.comments[0].body).toContain(`/projects/${projectId}?task=${taskId}`)
    expect(await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('github-complete-merge.png'), animations: 'disabled' })
    await page.getByRole('button', { name: 'Remover vínculo', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Repositório do PR' })).toBeVisible()
    await fixture(page, 'github', { state: 'open' })
    await linkPR(page)
    await fixture(page, 'github', { state: 'merged' })
    await fixture(page, 'worker')
    expect((await (await page.request.get(`${fixtureUrl}/__test/github`)).json()).comments).toHaveLength(1)
    expect(await taskStatus()).toBe('done')
    const history = await must(
      await db.from('activity_events').select('action').eq('task_id', taskId).eq('action', 'github_status_changed'),
    )
    expect(history!.length).toBeGreaterThanOrEqual(5)
  })

  test('tarefas escolhem repositórios diferentes; acesso revogado mostra falha e permite desvincular', async ({
    page,
  }) => {
    await createTask(page, 'Primeira tarefa')
    await linkPR(page)
    await fixture(page, 'worker')
    await page.keyboard.press('Escape')
    await createTask(page, 'Segunda tarefa')
    await linkPR(page, 'orbit-test/segundo-repo')
    await fixture(page, 'worker')
    const db = await database()
    const links = await must(
      await db.from('task_github_links').select('task_id,repository_id').eq('project_id', projectId!),
    )
    expect(new Set(links!.map((link) => link.repository_id)).size).toBe(2)
    const denied = await page.request.post(`${fixtureUrl}/functions/v1/github-api`, { data: { action: 'config' } })
    expect(denied.status()).toBe(401)
    const invalidWebhook = await page.request.post(`${fixtureUrl}/functions/v1/github-webhook`, {
      data: {},
      headers: { 'x-hub-signature-256': 'sha256=invalid' },
    })
    expect(invalidWebhook.status()).toBe(401)
    // The real repository selection RPC marks both repositories as in use by tasks.
    await page.goto('/settings')
    await page.getByRole('button', { name: 'Revisar repositórios conectados' }).click()
    await page.getByRole('button', { name: 'Conectar orbit-test', exact: true }).click()
    for (const repo of ['orbit-test/entregas', 'orbit-test/segundo-repo']) {
      await expect(page.getByRole('checkbox', { name: repo, exact: true })).toBeChecked()
      await expect(page.getByRole('checkbox', { name: repo, exact: true })).toBeDisabled()
    }
    await fixture(page, 'github', { unavailable: true })
    await pullEvent(page, 'open', 11)
    expect(await fixture(page, 'worker')).toEqual([expect.objectContaining({ ok: false })])
    await page.goto(`/projects/${projectId}`)
    await openTask(page, 'Segunda tarefa')
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('não está disponível')
    const second = await must(
      await db.from('tasks').select('status').eq('project_id', projectId!).eq('title', 'Segunda tarefa').single(),
    )
    expect(second!.status).toBe('in_progress')
    await fixture(page, 'event', {
      name: 'installation_repositories',
      body: {
        action: 'removed',
        installation: { id: 20 },
        repositories_removed: [{ id: 11 }],
      },
    })
    await refreshTask(page, 'Segunda tarefa')
    await expect(page.getByRole('button', { name: 'Sincronizar', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Remover vínculo', exact: true }).click()
    await expect(page.getByRole('combobox', { name: 'Repositório do PR' })).toBeVisible()
    expect(await must(await db.from('task_github_links').select('id').eq('project_id', projectId!))).toHaveLength(1)
    expect(await fixture(page, 'worker')).toEqual([])
    expect((await (await page.request.get(`${fixtureUrl}/__test/github`)).json()).comments).toEqual([])
    expect(
      await must(
        await db
          .from('github_repositories')
          .select('active')
          .eq('workspace_id', workspaceId)
          .eq('github_id', 11)
          .single(),
      ),
    ).toEqual({ active: false })
  })
})
