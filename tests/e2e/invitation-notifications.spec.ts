import { expect, test, type Page } from '@playwright/test'
import { confirmed, notificationSandbox } from '../support/notification-backend'

async function login(page: Page, password: string) {
  await page.goto('/dashboard')
  await page.getByLabel('E-mail', { exact: true }).fill('rafael@orbit.local')
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar no workspace' }).click()
  await expect(page.locator('.notification-bell')).not.toHaveAttribute('aria-label', 'Notificações — carregando')
}

test('recebe convite de outra empresa ao vivo, remove cancelamento nas abas e abre a aceitação', async ({ page, context }, testInfo) => {
  const sandbox = await notificationSandbox()
  const companyName = `IL Tech — criação e desenvolvimento ${crypto.randomUUID().slice(0, 8)}`
  const company = confirmed(await sandbox.owner.rpc('create_company', { company_name: companyName }))
  try {
    await login(page, sandbox.config.password)
    await page.locator('.notification-bell').click()
    await expect(page.getByText(/Conectando atualizações ao vivo/)).toHaveCount(0)
    const secondTab = await context.newPage()
    await secondTab.goto('/dashboard')
    await expect(secondTab.locator('.notification-bell')).toHaveAttribute('aria-label', 'Notificações — 0 não lidas')
    const invitation = confirmed(await sandbox.owner.rpc('invite_collaborator', { target_workspace: company.id, invite_email: 'rafael@orbit.local' }))
    await expect(page.locator('.notification-bell')).toHaveAttribute('aria-label', 'Notificações — 0 não lidas e 1 convite pendente', { timeout: 10_000 })
    await expect(secondTab.locator('.notification-count')).toHaveText('1', { timeout: 10_000 })
    await expect(page.getByRole('button', { name: `Ver convite de ${companyName}` })).toBeVisible()
    expect(confirmed(await sandbox.recipient.from('profiles').select('active_workspace_id').eq('id', sandbox.member.id).single()).active_workspace_id).toBe(sandbox.workspace)
    expect(confirmed(await sandbox.recipient.from('workspaces').select('id').eq('id', company.id))).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('cross-workspace-invitation.png'), animations: 'disabled' })
    confirmed(await sandbox.owner.rpc('revoke_invitation', { invitation_id: invitation.id }))
    await expect(page.locator('.notification-bell')).toHaveAttribute('aria-label', 'Notificações — 0 não lidas', { timeout: 10_000 })
    await expect(secondTab.locator('.notification-bell')).toHaveAttribute('aria-label', 'Notificações — 0 não lidas', { timeout: 10_000 })
    await secondTab.close()
    const renewed = confirmed(await sandbox.owner.rpc('invite_collaborator', { target_workspace: company.id, invite_email: 'rafael@orbit.local' }))
    const open = page.getByRole('button', { name: `Ver convite de ${companyName}` })
    await expect(open).toBeVisible({ timeout: 10_000 })
    await open.focus(); await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`/companies\\?invitation=${renewed.id}$`))
    await page.getByRole('button', { name: `Aceitar convite de ${companyName}` }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
    await expect(page.locator('.notification-bell')).toHaveAttribute('aria-label', 'Notificações — 0 não lidas')
    expect(confirmed(await sandbox.recipient.rpc('my_invitations')).some(item => item.id === renewed.id)).toBe(false)
    expect(confirmed(await sandbox.recipient.from('profiles').select('active_workspace_id').eq('id', sandbox.member.id).single()).active_workspace_id).toBe(company.id)
  } finally {
    confirmed(await sandbox.admin.from('workspaces').delete().eq('id', company.id).select().single())
    await sandbox.cleanup()
  }
})

test('recupera convite anterior à conexão e bloqueia o canal de outra conta', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Recovery and account authorization run once on desktop.')
  const sandbox = await notificationSandbox()
  const company = confirmed(await sandbox.owner.rpc('create_company', { company_name: 'Convite já enviado' }))
  try {
    const invitation = confirmed(await sandbox.owner.rpc('invite_collaborator', { target_workspace: company.id, invite_email: 'rafael@orbit.local' }))
    await login(page, sandbox.config.password)
    await expect(page.locator('.notification-count')).toHaveText('1')
    await page.locator('.notification-bell').click()
    await expect(page.getByRole('button', { name: 'Ver convite de Convite já enviado' })).toBeVisible()
    expect(confirmed(await sandbox.owner.rpc('my_invitations')).some(item => item.id === invitation.id)).toBe(false)
    await sandbox.owner.realtime.setAuth()
    const status = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Invitation channel authorization timed out')), 10_000)
      sandbox.owner.channel(`invitations:${sandbox.member.id}`, { config: { private: true } })
        .on('broadcast', { event: 'invitations_changed' }, () => reject(new Error('Private invitation signal leaked')))
        .subscribe(value => { if (value !== 'CLOSED') { clearTimeout(timeout); resolve(value) } })
    })
    expect(status).toBe('CHANNEL_ERROR')
    confirmed(await sandbox.admin.from('workspace_invitations').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', invitation.id).select().single())
    await expect(page.locator('.notification-bell')).toHaveAttribute('aria-label', 'Notificações — 0 não lidas', { timeout: 10_000 })
  } finally {
    confirmed(await sandbox.admin.from('workspaces').delete().eq('id', company.id).select().single())
    await sandbox.cleanup()
  }
})
