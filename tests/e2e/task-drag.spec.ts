import { expect } from '@playwright/test'
import { test, moveCard, observeDragPreview } from './task-drag-helpers'

test.describe('Arraste de tarefas com backend local', () => {
  test.skip(process.env.ORBIT_TASK_DRAG_E2E !== '1', 'Opt-in: requer Auth/PostgREST e seed locais.')
  test.beforeEach(({ isMobile }, info) => {
    test.skip(isMobile && !info.title.startsWith('seletor'), 'Arraste nativo usa mouse; celular usa o seletor.')
  })

  test('prévia contém apenas o card, destino destacado e mudança persiste', async ({ page, board }, info) => {
    await observeDragPreview(page)
    await moveCard(page, 'in_progress', false)
    await expect(page.locator('.task-card')).toHaveAttribute('data-dragging', 'true')
    await expect(page.locator('[data-status=in_progress]')).toHaveAttribute('data-drop-target', 'true')
    const snapshot = JSON.parse((await page.locator('body').getAttribute('data-drag-snapshot'))!)
    expect(snapshot).toMatchObject({
      isCard: true,
      parentIsBody: true,
      inert: true,
      hidden: 'true',
      ids: 0,
      pageContent: 0,
    })
    expect(snapshot.width).toBeCloseTo(snapshot.sourceWidth, 1)
    expect(snapshot.height).toBeCloseTo(snapshot.sourceHeight, 1)
    expect(snapshot.x).toBeGreaterThan(0)
    expect(snapshot.x).toBeLessThan(snapshot.width)
    expect(snapshot.y).toBeGreaterThan(0)
    expect(snapshot.y).toBeLessThan(snapshot.height)
    await expect(page.locator('.native-drag-preview')).toHaveCount(0)
    await page.screenshot({ path: info.outputPath('drag-active.png') })
    await page.mouse.up()
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    await expect.poll(board.status).toBe('in_progress')
    await page.reload()
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    await expect(page.locator('[data-dragging], [data-drop-target]')).toHaveCount(0)
  })

  test('cancelar, soltar na mesma coluna e conteúdo externo não gravam', async ({ page, board }) => {
    let writes = 0
    page.on('request', (request) => {
      if (request.method() === 'PATCH' && request.url().includes('/rest/v1/tasks?')) writes++
    })
    await moveCard(page, 'in_progress', false)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await expect(page.locator('[data-dragging], [data-drop-target]')).toHaveCount(0)
    await moveCard(page, 'todo')
    const external = await page.evaluateHandle(() => {
      const transfer = new DataTransfer()
      transfer.setData('text/plain', 'external-task')
      return transfer
    })
    await page.locator('[data-status=in_progress]').dispatchEvent('drop', { dataTransfer: external })
    await external.dispose()
    expect(await board.status()).toBe('todo')
    expect(writes).toBe(0)
    await expect(page.locator('[data-status=todo] .task-card')).toHaveCount(1)
  })

  test('falha de gravação mantém a tarefa e permite tentar novamente', async ({ page, board }) => {
    await page.route('**/rest/v1/tasks?**', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 403, json: { code: '42501', message: 'permission denied' } })
        : route.continue(),
    )
    await moveCard(page, 'in_progress')
    await expect(page.getByRole('alert')).toBeVisible()
    expect(await board.status()).toBe('todo')
    await expect(page.locator('[data-status=todo] .task-card')).toHaveCount(1)
    await expect(page.locator('[data-dragging], [data-drop-target]')).toHaveCount(0)
    await page.unroute('**/rest/v1/tasks?**')
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await moveCard(page, 'in_progress')
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    expect(await board.status()).toBe('in_progress')
  })

  test('bloqueia outro arraste enquanto salva sem antecipar sucesso', async ({ page, board }) => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let writes = 0
    await page.route('**/rest/v1/tasks?**', async (route) => {
      if (route.request().method() === 'PATCH') {
        writes++
        await gate
      }
      await route.continue()
    })
    try {
      await moveCard(page, 'in_progress')
      await expect(page.locator('.task-card')).toHaveAttribute('draggable', 'false')
      await expect(page.getByRole('combobox', { name: `Status de ${board.title}` })).toBeDisabled()
      await expect(page.locator('[data-status=todo] .task-card')).toHaveCount(1)
      expect(await board.status()).toBe('todo')
      await moveCard(page, 'in_progress')
      expect(writes).toBe(1)
    } finally {
      release()
    }
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    expect(await board.status()).toBe('in_progress')
  })

  test('arraste no layout de tablet mantém o destino e a persistência', async ({ page, board }, info) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await moveCard(page, 'in_progress')
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    expect(await board.status()).toBe('in_progress')
    await page.screenshot({ path: info.outputPath('drag-tablet.png') })
  })

  test('seletor acessível persiste status por teclado e cabe no celular', async ({ page, board }, info) => {
    const select = page.getByRole('combobox', { name: `Status de ${board.title}` })
    await select.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('option', { name: 'A fazer', exact: true })).toBeFocused()
    await page.keyboard.press('ArrowDown')
    await expect(page.getByRole('option', { name: 'Em andamento', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    expect(await board.status()).toBe('in_progress')
    await page.reload()
    await expect(page.locator('[data-status=in_progress] .task-card')).toHaveCount(1)
    if (info.project.name === 'mobile') {
      await page.setViewportSize({ width: 320, height: 740 })
      await select.scrollIntoViewIfNeeded()
      const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }))
      expect(width.page).toBeLessThanOrEqual(width.viewport)
    }
    await page.screenshot({ path: info.outputPath('drag-confirmed.png') })
  })
})
