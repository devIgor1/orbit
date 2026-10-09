import { expect, test } from '@playwright/test'
import { openWorkspace } from './local-session'

test('período consulta indicadores reais e mantém os projetos acessíveis', async ({ page }) => {
  test.skip(!(await openWorkspace(page)), 'Requer conta local do Orbit.')
  await expect(page.locator('.metric-value').first()).not.toHaveText('—')
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/rpc/dashboard_summary') &&
      response.request().postDataJSON()?.period_days === 30 &&
      response.ok(),
  )
  await page.getByRole('combobox', { name: 'Período dos indicadores' }).click()
  await page.getByRole('option', { name: 'Últimos 30 dias', exact: true }).click()
  const summary = await (await responsePromise).json()
  await expect(page).toHaveURL(/period=30/)
  await expect(page.locator('.metric-value')).toHaveText(
    [summary.active_projects, summary.pending_tasks, summary.overdue_tasks, summary.completed_tasks].map((value) =>
      new Intl.NumberFormat('pt-BR').format(value),
    ),
  )
  await expect(page.getByText('Criação e conclusão nos últimos 30 dias', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(await page.locator('html').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  const card = page.locator('.dashboard-project-card').first()
  await expect(card).toBeVisible()
  const title = await card.getByRole('heading').textContent()
  await card.click()
  await expect(page.getByRole('heading', { level: 1, name: title!, exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: title!, exact: true })).toBeVisible()
})

test('falha nos indicadores mostra erro, preserva projetos e permite recuperação', async ({ page }) => {
  test.skip(!(await openWorkspace(page)), 'Requer conta local do Orbit.')
  await expect(page.locator('.metric-value').first()).not.toHaveText('—')
  await page.route('**/rest/v1/rpc/dashboard_summary', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Indisponibilidade simulada no teste.' }),
    }),
  )
  await page.getByRole('combobox', { name: 'Período dos indicadores' }).click()
  await page.getByRole('option', { name: 'Últimos 30 dias', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.metrics-grid')).toHaveCount(0)
  await expect(page.locator('.evolution-panel')).toHaveCount(0)
  await expect(page.locator('.distribution-panel')).toHaveCount(0)
  await expect(page.locator('.dashboard-project-card').first()).toBeVisible()
  await page.unroute('**/rest/v1/rpc/dashboard_summary')
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.metric-value').first()).not.toHaveText('—')
  await expect(page.locator('.evolution-panel')).toBeVisible()
})
