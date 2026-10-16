import { expect, test } from '@playwright/test'
import { aiCreated, aiRequest } from '../fixtures/ai-task'

test('prompt aceita no máximo 150 caracteres e informa a contagem', async ({ page }) => {
  const prompts: string[] = []
  await page.route('**/functions/v1/create-ai-task', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    prompts.push(route.request().postDataJSON().prompt)
    await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, json: aiCreated })
  })
  await page.goto('/tests/fixtures/ai-task.html')
  await page.getByRole('button', { name: 'Criar com IA', exact: true }).click()
  const prompt = page.getByLabel('O que precisa ser feito?')
  await expect(page.getByText('0/150 caracteres')).toBeVisible()
  await prompt.fill('a'.repeat(149))
  await page.keyboard.press('End')
  await page.keyboard.type('bc')
  await expect(prompt).toHaveValue(`${'a'.repeat(149)}b`)
  await expect(page.getByText('150/150 caracteres')).toBeVisible()
  await prompt.fill('')
  await page.keyboard.insertText('á'.repeat(160))
  await expect(prompt).toHaveValue('á'.repeat(150))
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).click()
  await expect(page.getByText('Tarefa criada', { exact: true })).toBeVisible()
  expect(prompts).toEqual(['á'.repeat(150)])
})

test('pedido por teclado, erro recuperável, esclarecimento e sucesso confirmado', async ({ page }, info) => {
  const ids: string[] = []
  let calls = 0
  await page.route('**/functions/v1/create-ai-task', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    ids.push(route.request().postDataJSON().requestId)
    calls++
    await route.fulfill({ status: calls === 1 ? 503 : 200, headers: { 'Access-Control-Allow-Origin': '*' },
      json: calls === 1 ? { code: 'AI_UNAVAILABLE' } : calls === 2
        ? { kind: 'clarification', message: 'Qual validação do checkout deve ser revisada?' } : aiCreated })
  })
  await page.goto('/tests/fixtures/ai-task.html')
  await page.getByRole('button', { name: 'Criar com IA', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  const prompt = page.getByLabel('O que precisa ser feito?')
  await prompt.fill(aiRequest.prompt)
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Seu texto foi preservado')
  await expect(prompt).toHaveValue(aiRequest.prompt)
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).click()
  await expect(page.getByText('Qual validação do checkout deve ser revisada?')).toBeVisible()
  expect(ids[0]).toBe(ids[1])
  await page.screenshot({ path: info.outputPath('ai-task-clarification.png'), fullPage: true })
  await prompt.fill(`${aiRequest.prompt} Validar CPF.`)
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).click()
  await expect(page.getByText('Tarefa criada', { exact: true })).toBeVisible()
  expect(ids[2]).not.toBe(ids[1])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('ai-task-success.png'), fullPage: true })
  await page.getByRole('button', { name: 'Abrir tarefa' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText(`Tarefa aberta: ${aiCreated.task.id}`)).toBeVisible()
})

test('recusa de escopo e limite da empresa preservam o pedido sem criar tarefa', async ({ page }, info) => {
  let calls = 0
  await page.route('**/functions/v1/create-ai-task', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    calls++
    await route.fulfill({ status: calls === 1 ? 200 : 429, headers: { 'Access-Control-Allow-Origin': '*' },
      json: calls === 1 ? { kind: 'rejected', reason: 'out_of_scope' } : { code: 'AI_WORKSPACE_RATE_LIMITED', quota: {
        blocked: [{ scope: 'workspace', windowSeconds: 600, used: 75, limit: 75, retryAfterSeconds: 125 }],
        retryAfterSeconds: 125,
      } } })
  })
  await page.goto('/tests/fixtures/ai-task.html')
  await page.getByRole('button', { name: 'Criar com IA', exact: true }).click()
  const prompt = page.getByLabel('O que precisa ser feito?')
  await expect(prompt).toBeFocused()
  await prompt.fill('Qual é a capital da França?')
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByText(/A IA do Orbit serve para cadastrar tarefas/)).toBeVisible()
  await page.getByText(/A IA do Orbit serve para cadastrar tarefas/).scrollIntoViewIfNeeded()
  await expect(page.getByText(/A IA do Orbit serve para cadastrar tarefas/)).toBeInViewport()
  await expect(page.getByText('Tarefa criada', { exact: true })).toHaveCount(0)
  await expect(prompt).toHaveValue('Qual é a capital da França?')
  await page.screenshot({ path: info.outputPath('ai-task-rejected.png'), fullPage: true })
  await prompt.fill(aiRequest.prompt)
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).click()
  await expect(page.getByRole('alert')).toContainText('Sua empresa: 75 de 75 tentativas nos últimos 10 minutos')
  await expect(page.getByRole('timer')).toContainText('Nova tentativa estimada em 2 min')
  await page.getByRole('alert').scrollIntoViewIfNeeded()
  await expect(page.getByRole('alert')).toBeInViewport()
  await expect(prompt).toHaveValue(aiRequest.prompt)
  await expect(page.getByText('Tarefa criada', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('ai-task-company-quota.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  if (info.project.name === 'desktop') {
    await page.setViewportSize({ width: 820, height: 1180 })
    await page.getByRole('button', { name: 'Criar com IA', exact: true }).click()
    await page.getByRole('alert').scrollIntoViewIfNeeded()
    await expect(page.getByRole('alert')).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('ai-task-company-quota-tablet.png'), fullPage: true })
  }
})

test('cotas simultâneas mostram consumo, janela e espera sem reenvio automático', async ({ page }, info) => {
  await page.clock.install()
  let calls = 0
  await page.route('**/functions/v1/create-ai-task', async route => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } })
    calls++
    await route.fulfill({ status: 429, headers: { 'Access-Control-Allow-Origin': '*' }, json: {
      code: 'AI_RATE_LIMITED', quota: { blocked: [
        { scope: 'user', windowSeconds: 600, used: 15, limit: 15, retryAfterSeconds: 125 },
        { scope: 'user', windowSeconds: 86400, used: 150, limit: 150, retryAfterSeconds: 3661 },
        { scope: 'workspace', windowSeconds: 600, used: 75, limit: 75, retryAfterSeconds: 125 },
        { scope: 'workspace', windowSeconds: 86400, used: 750, limit: 750, retryAfterSeconds: 3661 },
      ], retryAfterSeconds: 3661 },
    } })
  })
  await page.goto('/tests/fixtures/ai-task.html')
  await page.getByRole('button', { name: 'Criar com IA', exact: true }).click()
  const prompt = page.getByLabel('O que precisa ser feito?')
  await prompt.fill(aiRequest.prompt)
  await page.getByRole('button', { name: 'Criar tarefa com IA' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('Seu usuário: 15 de 15 tentativas nos últimos 10 minutos')
  await expect(page.getByRole('alert')).toContainText('Seu usuário: 150 de 150 tentativas nas últimas 24 horas')
  await expect(page.getByRole('alert')).toContainText('Sua empresa: 750 de 750 tentativas nas últimas 24 horas')
  await page.getByRole('timer').scrollIntoViewIfNeeded()
  await expect(page.getByRole('timer')).toBeInViewport()
  await expect(page.getByRole('timer')).toContainText('1 h 1 min')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('ai-task-all-quotas.png'), fullPage: true })
  await page.clock.fastForward(3_662_000)
  await expect(page.getByRole('timer')).toContainText('Prazo estimado encerrado')
  await expect(prompt).toHaveValue(aiRequest.prompt)
  expect(calls).toBe(1)
  await page.getByRole('button', { name: 'Fechar', exact: true }).last().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
