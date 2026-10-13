import { createClient } from '@supabase/supabase-js'
import { expect, test as base, type Page } from '@playwright/test'
import type { Database, Task } from '../../src/lib/supabase/database.types'
import { localBackend } from '../support/local-backend'
import { openWorkspace } from './local-session'

type Board = { title: string; status: () => Promise<Task['status']> }
export const test = base.extend<{ board: Board }>({
  board: async ({ page }, runFixture, info) => {
    const config = await localBackend()
    const db = createClient<Database>(config.API_URL, config.SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const title = `Arraste ${info.project.name} ${Date.now()}`
    expect(await openWorkspace(page, '/projects')).toBe(true)
    await page.getByRole('button', { name: 'Novo projeto', exact: true }).click()
    await page.getByLabel('Nome do projeto').fill(title)
    await page.getByRole('button', { name: 'Criar projeto', exact: true }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await page.getByRole('link', { name: title, exact: true }).click()
    await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/)
    const projectId = new URL(page.url()).pathname.split('/').at(-1)!
    try {
      await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
      await page.getByLabel('Nome da tarefa').fill(title)
      await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible()
      await expect(page.locator('.task-card')).toHaveCount(1)
      await runFixture({
        title,
        status: async () => {
          const { data, error } = await db.from('tasks').select('status').eq('project_id', projectId).single()
          if (error) throw error
          if (!data) throw new Error('Missing task after write')
          return data.status
        },
      })
    } finally {
      const { data } = await db.from('projects').delete().eq('id', projectId).select('id').single().throwOnError()
      expect(data?.id).toBe(projectId)
    }
  },
})

export async function moveCard(page: Page, status: Task['status'], release = true) {
  const source = page.locator('.task-card .task-drag-handle')
  await source.scrollIntoViewIfNeeded()
  const from = await source.boundingBox()
  const to = await page.locator(`.task-column[data-status=${status}]`).boundingBox()
  if (!from || !to) throw new Error('Missing drag geometry')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 })
  await page.mouse.move(to.x + to.width / 2, to.y + 100, { steps: 15 })
  await page.mouse.move(to.x + to.width / 2, to.y + 110)
  if (release) await page.mouse.up()
}

export async function observeDragPreview(page: Page) {
  await page.evaluate(() => {
    const native = DataTransfer.prototype.setDragImage
    DataTransfer.prototype.setDragImage = function (element, x, y) {
      const preview = element.getBoundingClientRect()
      const source = document.querySelector('.task-board .task-card')!.getBoundingClientRect()
      const record = {
        isCard: element.matches('.task-card.native-drag-preview'),
        parentIsBody: element.parentElement === document.body,
        inert: element.getAttribute('inert') !== null,
        hidden: element.getAttribute('aria-hidden'),
        ids: element.querySelectorAll('[id]').length,
        pageContent: element.querySelectorAll('.sidebar, .page-header, .task-board').length,
        width: preview.width,
        height: preview.height,
        sourceWidth: source.width,
        sourceHeight: source.height,
        x,
        y,
      }
      document.body.dataset.dragSnapshot = JSON.stringify(record)
      native.call(this, element, x, y)
    }
  })
}
