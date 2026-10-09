import { expect, test, type Page } from '@playwright/test'

async function openLanding(page: Page) {
  const audit = { businessRequests: [] as string[], errors: [] as string[] }
  page.on('pageerror', (error) => audit.errors.push(error.message))
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/rest/v1/')) audit.businessRequests.push(url.pathname)
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  return audit
}

test('abas de recursos mantêm seleção, painéis e navegação por teclado sincronizados', async ({ page }) => {
  const audit = await openLanding(page)
  const features = page.locator('#recursos')
  const tabs = features.getByRole('tablist', { name: 'Recursos do Orbit', exact: true })
  await tabs.scrollIntoViewIfNeeded()
  await expect(tabs.getByRole('tab')).toHaveCount(4)
  await expect(features.getByRole('tabpanel', { includeHidden: true })).toHaveCount(4)
  const descriptions = new Set<string>()
  const scene = features.locator('.landing-feature-showcase')
  const featureNames: Record<string, string> = {
    Projetos: 'projects',
    Tarefas: 'tasks',
    Equipe: 'team',
    'Visão geral': 'overview',
  }

  async function expectSelected(name: string) {
    const tab = tabs.getByRole('tab', { name, exact: true })
    const panel = features.getByRole('tabpanel', { name, exact: true })
    await expect(tab).toHaveAttribute('aria-selected', 'true')
    await expect(tab).toHaveAttribute('tabindex', '0')
    await expect(tabs.getByRole('tab', { selected: true })).toHaveCount(1)
    await expect(features.getByRole('tabpanel')).toHaveCount(1)
    await expect(panel).toBeVisible()
    await expect(panel).toHaveAttribute('id', (await tab.getAttribute('aria-controls'))!)
    await expect(panel).toHaveAttribute('aria-labelledby', (await tab.getAttribute('id'))!)
    const inactiveTabStops = await tabs
      .getByRole('tab', { selected: false })
      .evaluateAll(
        (elements) => elements.filter((element) => element instanceof HTMLElement && element.tabIndex >= 0).length,
      )
    expect(inactiveTabStops).toBe(0)
    await expect(panel).toContainText(/\S/)
    descriptions.add((await panel.innerText()).trim())
    await expect(scene).toHaveAttribute('data-feature', featureNames[name])
    return { tab, panel }
  }

  const initial = await expectSelected('Projetos')
  await initial.tab.focus()
  for (const [key, name] of [
    ['ArrowRight', 'Tarefas'],
    ['ArrowRight', 'Equipe'],
    ['End', 'Visão geral'],
    ['ArrowRight', 'Projetos'],
    ['ArrowLeft', 'Visão geral'],
    ['Home', 'Projetos'],
  ]) {
    await page.keyboard.press(key)
    const selected = await expectSelected(name)
    await expect(selected.tab).toBeFocused()
  }
  expect(descriptions.size).toBe(4)
  const access = features.getByRole('link', { name: 'Acessar workspace', exact: true })
  const explore = features.getByRole('link', { name: 'Explorar produto', exact: true })
  await expect(access).toHaveAttribute('href', '/login')
  await expect(explore).toHaveAttribute('href', '#produto')
  await page.keyboard.press('Tab')
  await expect(initial.panel).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(access).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(explore).toBeFocused()
  expect(audit).toEqual({ businessRequests: [], errors: [] })
})

test('canvas conecta quatro entradas, ativa as saídas e reinicia sem alterar dados', async ({ page, isMobile }) => {
  const audit = await openLanding(page)
  const workflow = page.locator('#como-funciona')
  const status = workflow.getByRole('status')
  await workflow.scrollIntoViewIfNeeded()
  await expect(status).toContainText('1 de 4 entradas conectadas')
  await expect(workflow).toHaveAttribute('data-ready', 'false')
  const connectAll = workflow.getByRole('button', { name: 'Conectar tudo', exact: true })

  if (isMobile) {
    for (const [index, name] of ['Tarefas', 'Equipe', 'Prazos'].entries()) {
      await workflow.getByRole('button', { name: `Conectar ${name}`, exact: true }).tap()
      await expect(status).toContainText(`${index + 2} de 4 entradas conectadas`)
      await expect(workflow).toHaveAttribute('data-ready', String(index === 2))
    }
    await expect(workflow.locator('.workflow-mobile-destinations li[data-active=true]')).toHaveCount(4)
  } else {
    for (const [index, name] of ['Tarefas', 'Equipe', 'Prazos'].entries()) {
      const source = workflow.getByRole('button', { name: `Selecionar conexão de ${name}`, exact: true })
      await source.focus()
      await page.keyboard.press(index % 2 ? 'Space' : 'Enter')
      await expect(source).toHaveAttribute('aria-pressed', 'true')
      await expect(status).toContainText(`${name} selecionado`)
      const input = workflow.getByRole('button', { name: `Conectar ${name} ao projeto`, exact: true })
      await input.focus()
      await page.keyboard.press('Space')
      await expect(status).toContainText(`${index + 2} de 4 entradas conectadas`)
      await expect(workflow).toHaveAttribute('data-ready', String(index === 2))
    }
    await expect(workflow.locator('.workflow-card-connection[data-active=true]')).toHaveCount(4)
    const flow = workflow.locator('.workflow-cable-flow').first()
    await expect(flow).toHaveCSS('display', 'none')
  }
  await expect(status).toContainText('Fluxo completo')
  await expect(connectAll).toBeDisabled()
  await workflow.getByRole('button', { name: 'Desconectar Equipe', exact: true }).click()
  await expect(status).toContainText('3 de 4 entradas conectadas')
  await expect(workflow).toHaveAttribute('data-ready', 'false')
  await connectAll.click()
  await expect(workflow).toHaveAttribute('data-ready', 'true')
  await workflow.getByRole('button', { name: 'Reiniciar conexões', exact: true }).click()
  await expect(status).toContainText('1 de 4 entradas conectadas')
  await expect(workflow).toHaveAttribute('data-ready', 'false')
  expect(audit).toEqual({ businessRequests: [], errors: [] })
})

test('canvas permite arrastar cartões e cabos, recusa entrada incompatível e cancela pelo teclado', async ({ page, isMobile }) => {
  test.skip(isMobile, 'O fluxo móvel oferece os mesmos estados por toque, sem arrastar.')
  const audit = await openLanding(page)
  const workflow = page.locator('#como-funciona')
  await workflow.scrollIntoViewIfNeeded()
  const status = workflow.getByRole('status')
  const card = workflow.locator('.workflow-card[data-node=tasks]')
  const handle = workflow.getByRole('button', { name: 'Mover cartão Tarefas com as setas', exact: true })
  const initial = await card.boundingBox()
  expect(initial).not.toBeNull()
  await handle.focus()
  await page.keyboard.press('ArrowRight')
  const movedByKeyboard = await card.boundingBox()
  expect(movedByKeyboard!.x).toBeGreaterThan(initial!.x)
  const header = card.locator('.workflow-card-header')
  const headerBox = await header.boundingBox()
  await page.mouse.move(headerBox!.x + 35, headerBox!.y + 15)
  await page.mouse.down()
  await page.mouse.move(headerBox!.x + 75, headerBox!.y + 35, { steps: 8 })
  await page.mouse.up()
  const movedByPointer = await card.boundingBox()
  expect(movedByPointer!.x).toBeGreaterThan(movedByKeyboard!.x)
  expect(movedByPointer!.y).toBeGreaterThan(movedByKeyboard!.y)

  const source = workflow.getByRole('button', { name: 'Selecionar conexão de Tarefas', exact: true })
  const input = workflow.getByRole('button', { name: 'Conectar Tarefas ao projeto', exact: true })
  const wrongInput = workflow.getByRole('button', { name: 'Conectar Equipe ao projeto', exact: true })
  async function dragTo(destination: typeof input) {
    const from = await source.boundingBox(), to = await destination.boundingBox()
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2)
    await page.mouse.down()
    await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 })
    await page.mouse.up()
  }
  await dragTo(wrongInput)
  await expect(status).toContainText('Conexão incompatível')
  await expect(workflow).toHaveAttribute('data-ready', 'false')
  await expect(workflow.getByRole('button', { name: 'Desconectar Tarefas', exact: true })).toHaveCount(0)
  await dragTo(input)
  await expect(status).toContainText('2 de 4 entradas conectadas')
  await source.focus()
  await page.keyboard.press('Space')
  await expect(source).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(source).toHaveAttribute('aria-pressed', 'false')
  await expect(status).toContainText('2 de 4 entradas conectadas')
  await workflow.getByRole('button', { name: 'Reiniciar conexões', exact: true }).click()
  await expect(status).toContainText('1 de 4 entradas conectadas')
  expect((await card.boundingBox())!.x).toBeCloseTo(initial!.x, 1)
  expect((await card.boundingBox())!.y).toBeCloseTo(initial!.y, 1)
  expect(audit).toEqual({ businessRequests: [], errors: [] })
})
