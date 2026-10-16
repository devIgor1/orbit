import { expect, test } from '@playwright/test'
import { aiCreated, aiRequest } from '../fixtures/ai-task'

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
