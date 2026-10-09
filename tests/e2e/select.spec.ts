import { expect, test } from '@playwright/test'

for (const kind of ['project', 'task']) {
  test(`Select Base UI em ${kind}: Escape, teclado e valores enviados`, async ({ page }, testInfo) => {
    await page.goto(`/tests/fixtures/date-picker.html?kind=${kind}`)
    await page.getByLabel(kind === 'project' ? 'Nome do projeto' : 'Nome da tarefa').fill('Selecionar etapa')
    const status = page.getByRole('combobox', { name: 'Status', exact: true })
    await status.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).not.toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Teste do formulário' })).toBeVisible()
    await expect(status).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('option', { name: kind === 'project' ? 'Em andamento' : 'A fazer', exact: true })).toBeFocused()
    await page.keyboard.press('End')
    await expect(page.getByRole('option', { name: kind === 'project' ? 'Arquivado' : 'Concluído', exact: true })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(status).toHaveText(kind === 'project' ? 'Arquivado' : 'Concluído')
    await expect(page.getByLabel('Valores enviados')).toHaveCount(0)

    if (kind === 'task') {
      await page.getByRole('combobox', { name: 'Prioridade', exact: true }).click()
      await expect(page.getByRole('listbox')).toBeInViewport({ ratio: 1 })
      await page.screenshot({ path: testInfo.outputPath('select.png'), animations: 'disabled' })
      await page.getByRole('option', { name: 'Alta', exact: true }).click()
      await page.getByRole('combobox', { name: 'Responsável', exact: true }).click()
      await page.getByRole('option', { name: /^Pessoa de teste/ }).click()
      await expect(page.getByRole('combobox', { name: 'Responsável', exact: true })).toContainText('Pessoa de teste')
      await page.getByRole('combobox', { name: 'Responsável', exact: true }).click()
      await page.getByRole('option', { name: 'Sem responsável', exact: true }).click()
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.getByRole('button', { name: kind === 'project' ? 'Criar projeto' : 'Criar tarefa', exact: true }).click()
    const submitted = JSON.parse(await page.getByLabel('Valores enviados').innerText())
    expect(submitted.status).toBe(kind === 'project' ? 'archived' : 'done')
    if (kind === 'task') expect(submitted).toMatchObject({ priority: 'high', assignee_id: '' })
  })
}

test('falha no envio mantém as seleções do formulário', async ({ page }) => {
  await page.goto('/tests/fixtures/date-picker.html?kind=task&failure=1')
  await page.getByLabel('Nome da tarefa').fill('Falha de teste')
  const priority = page.getByRole('combobox', { name: 'Prioridade', exact: true })
  await priority.click()
  await page.getByRole('option', { name: 'Alta', exact: true }).click()
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(priority).toHaveText('Alta')
  await expect(page.getByLabel('Valores enviados')).toHaveCount(0)
})
