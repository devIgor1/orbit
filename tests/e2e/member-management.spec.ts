import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { createLocalAccount, createLocalCompany, createLocalInvitation } from './onboarding-helpers'

test.beforeAll(async () => {
  const env = await readFile('.env.docker.local', 'utf8')
  if (!/^VITE_SUPABASE_URL=http:\/\/(?:127\.0\.0\.1|localhost):55521\/?\s*$/m.test(env)) throw new Error('Member E2E requires local Supabase')
})
async function setRole(page: Page, label: string) {
  await page.getByRole('button', { name: 'Gerenciar acesso de Bruno Teste' }).click()
  await page.getByLabel('Nível de acesso').click()
  await page.getByRole('option', { name: label, exact: true }).click()
  await page.getByRole('button', { name: 'Salvar acesso' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}
async function createTask(page: Page, title: string, done = false) {
  await page.getByRole('button', { name: 'Nova tarefa', exact: true }).click()
  await page.getByLabel('Nome da tarefa').fill(title)
  await page.getByLabel('Responsável', { exact: true }).click()
  await page.getByRole('option', { name: 'Bruno Teste', exact: true }).click()
  if (done) {
    await page.getByLabel('Status', { exact: true }).click()
    await page.getByRole('option', { name: 'Concluído', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Criar tarefa', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test('admin altera acesso, transfere tarefas e remove sem apagar o histórico', async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000)
  expect(testInfo.project.use.baseURL).toBe('http://127.0.0.1:5174')
  const suffix = randomUUID()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const context = await browser.newContext({ ...testInfo.project.use, baseURL: 'http://127.0.0.1:5174' })
  const colleague = await context.newPage()
  colleague.on('pageerror', error => errors.push(error.message))
  try {
    await createLocalAccount(page, `admin-${suffix}@example.test`, '/onboarding', 'Ana Teste')
    await createLocalCompany(page, `Equipe ${suffix.slice(0,8)}`)
    await page.goto('/team')
    await page.getByRole('button', { name: 'Gerenciar acesso de Ana Teste' }).click()
    await expect(page.getByText('Esta pessoa é a única administradora.', { exact: false })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar acesso' })).toBeDisabled()
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await page.goto('/projects')
    await page.getByRole('button', { name: 'Novo projeto', exact: true }).click()
    await page.getByLabel('Nome do projeto').fill('Entrega compartilhada')
    await page.getByRole('button', { name: 'Criar projeto', exact: true }).click()
    await page.getByRole('link', { name: 'Entrega compartilhada', exact: true }).click()
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]{36}$/)
    const projectUrl = page.url()
    const invite = await createLocalInvitation(page, `member-${suffix}@example.test`)
    await createLocalAccount(colleague, `member-${suffix}@example.test`, invite.pathname + invite.search, 'Bruno Teste')
    await colleague.getByRole('button', { name: 'Aceitar convite' }).click()
    await expect(colleague).toHaveURL(/\/dashboard$/)
    await colleague.goto(projectUrl)
    await createTask(colleague, 'Pesquisa pendente')
    await createTask(colleague, 'Entrega concluída', true)
    await colleague.getByRole('button', { name: 'Pesquisa pendente', exact: true }).click()
    await colleague.getByRole('button', { name: 'Comentários', exact: true }).click()
    await colleague.getByLabel('Adicionar comentário').fill('Contexto que deve permanecer após minha saída.')
    await colleague.getByRole('button', { name: 'Enviar comentário' }).click()
    await expect(colleague.getByText('Contexto que deve permanecer após minha saída.', { exact: true })).toBeVisible()
    await colleague.getByRole('button', { name: 'Fechar', exact: true }).click()
    await page.goto('/team')
    await setRole(page, 'Administrador')
    await expect(colleague.getByRole('button', { name: 'Editar projeto', exact: true })).toBeVisible({ timeout: 25_000 })
    await setRole(page, 'Colaborador')
    await expect(colleague.getByRole('button', { name: 'Editar projeto', exact: true })).not.toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: 'Gerenciar acesso de Bruno Teste' }).click()
    await page.screenshot({ path: testInfo.outputPath('member-access.png') })
    await page.getByRole('button', { name: 'Remover membro' }).click()
    await expect(page.getByText('tarefa pendente atribuída a esta pessoa.', { exact: false })).toBeVisible()
    await page.getByLabel('Destino das tarefas pendentes').click()
    await page.getByRole('option', { name: 'Ana Teste', exact: true }).click()
    if (testInfo.project.name === 'desktop') {
      const initial = page.viewportSize()!
      for (const size of [{ width: 820, height: 1180 }, { width: 320, height: 700 }]) {
        await page.setViewportSize(size)
        await expect(page.getByRole('button', { name: 'Remover da empresa', exact: true })).toBeVisible()
        await page.screenshot({ path: testInfo.outputPath(`member-removal-${size.width}.png`) })
        await expect.poll(() => page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth,
          overflow: [...document.querySelectorAll('body *')].filter(element => element.getBoundingClientRect().right > innerWidth + 1).slice(0, 12).map(element => element.className) })))
          .toMatchObject({ viewport: size.width, width: size.width })
      }
      await page.setViewportSize(initial)
    }
    await page.screenshot({ path: testInfo.outputPath('member-removal.png') })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('button', { name: 'Remover da empresa', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { name: 'Bruno Teste', exact: true })).not.toBeVisible()
    await expect(colleague).toHaveURL(/\/(companies|onboarding)$/, { timeout: 25_000 })
    await page.getByRole('button', { name: 'Histórico de acessos', exact: true }).click()
    await expect(page.getByText(/removeu/)).toHaveText('Ana Teste removeu Bruno Teste.')
    await expect(page.getByText(/transferida para Ana Teste/)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('member-history.png') })
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await page.goto(projectUrl)
    await page.getByRole('button', { name: 'Pesquisa pendente', exact: true }).click()
    await expect(page.getByLabel('Responsável', { exact: true })).toHaveText(/Ana Teste/)
    await page.getByRole('button', { name: 'Comentários', exact: true }).click()
    await expect(page.getByText('Contexto que deve permanecer após minha saída.', { exact: true })).toBeVisible()
    await expect(page.locator('.comment-author strong')).toHaveText('Bruno Teste')
    await page.getByRole('button', { name: 'Fechar', exact: true }).click()
    await page.getByRole('button', { name: 'Entrega concluída', exact: true }).click()
    await expect(page.getByLabel('Responsável', { exact: true })).toHaveText(/Bruno Teste \(fora da equipe\)/)
    expect(errors).toEqual([])
  } finally { await context.close() }
})
