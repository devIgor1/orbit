import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationCenter } from '@/features/notifications/components/notification-center'
import { fetchMyInvitations } from '@/features/companies/services/invitation-service'
import { fetchNotifications, markAllNotificationsRead } from '@/features/notifications/services/notification-service'
import { subscribeToNotifications } from '@/features/notifications/services/notification-realtime'
import { subscribeToPrivateBroadcast } from '@/lib/supabase/private-broadcast'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testWorkspace } from './test-providers'
import { notificationPage } from './fixtures/notifications'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/notifications/services/notification-service', () => ({ fetchNotifications: vi.fn(), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }))
vi.mock('@/features/notifications/services/notification-realtime', () => ({ subscribeToNotifications: vi.fn() }))
vi.mock('@/features/companies/services/invitation-service', () => ({ fetchMyInvitations: vi.fn() }))
vi.mock('@/lib/supabase/private-broadcast', () => ({ subscribeToPrivateBroadcast: vi.fn() }))

const invitation = { id: 'f1500000-0000-4000-8000-000000000001', workspace_name: 'IL Tech', email: 'invited@example.test', expires_at: '2099-10-21T12:00:00Z' }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fetchWorkspace).mockResolvedValue(testWorkspace)
  vi.mocked(fetchNotifications).mockResolvedValue({ ...notificationPage, items: [], unread_count: 0 })
  vi.mocked(fetchMyInvitations).mockResolvedValue([invitation])
  vi.mocked(subscribeToNotifications).mockImplementation((_workspace, _user, _refresh, status) => { status('connected'); return vi.fn() })
  vi.mocked(subscribeToPrivateBroadcast).mockImplementation((_topic, _event, _refresh, status) => { status('connected'); return vi.fn() })
})
function Destination() { const location = useLocation(); return <output aria-label="Destino do convite">{location.pathname}{location.search}</output> }
function setup() {
  const client = createTestClient()
  render(<TestProviders client={client} initialEntries={['/dashboard']}><Routes>
    <Route path="/dashboard" element={<NotificationCenter />} /><Route path="/companies" element={<Destination />} />
  </Routes></TestProviders>)
  return { client, user: userEvent.setup() }
}

describe('Account invitations in the notification bell', () => {
  it('includes an invitation from another workspace and opens its acceptance screen by keyboard', async () => {
    const { user } = setup()
    const bell = await screen.findByRole('button', { name: 'Notificações — 0 não lidas e 1 convite pendente' })
    expect(bell).toHaveTextContent('1')
    await user.click(bell)
    expect(screen.getByRole('heading', { name: 'Convites para você' })).toBeVisible()
    const open = screen.getByRole('button', { name: 'Ver convite de IL Tech' })
    open.focus(); await user.keyboard('{Enter}')
    expect(await screen.findByLabelText('Destino do convite')).toHaveTextContent(`/companies?invitation=${invitation.id}`)
  })
  it('refreshes pending invitations across workspaces and removes revoked/accepted invitations', async () => {
    setup()
    const bell = await screen.findByRole('button', { name: /1 convite pendente/ })
    expect(subscribeToPrivateBroadcast).toHaveBeenCalledWith('invitations:user-1', 'invitations_changed', expect.any(Function), expect.any(Function))
    vi.mocked(fetchMyInvitations).mockResolvedValue([])
    await act(async () => { vi.mocked(subscribeToPrivateBroadcast).mock.calls[0][2]() })
    await waitFor(() => expect(bell).toHaveAttribute('aria-label', 'Notificações — 0 não lidas'))
    expect(bell).not.toHaveTextContent('1')
  })
  it('keeps invitations pending when task notifications are marked read or filtered', async () => {
    vi.mocked(fetchNotifications).mockResolvedValue(notificationPage)
    vi.mocked(markAllNotificationsRead).mockResolvedValue(1)
    const { user } = setup()
    const bell = await screen.findByRole('button', { name: /1 não lidas e 1 convite pendente/ })
    expect(bell).toHaveTextContent('2')
    await user.click(bell)
    vi.mocked(fetchNotifications).mockResolvedValue({ ...notificationPage, items: [], unread_count: 0 })
    await user.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    await waitFor(() => expect(bell).toHaveAttribute('aria-label', 'Notificações — 0 não lidas e 1 convite pendente'))
    await user.click(screen.getByRole('button', { name: 'Não lidas' }))
    expect(screen.getByRole('button', { name: 'Ver convite de IL Tech' })).toBeVisible()
  })
  it('does not show a partial count or an empty invitation inbox when its request fails', async () => {
    vi.mocked(fetchMyInvitations).mockRejectedValue(new AppError('network', 'Não foi possível carregar seus convites.'))
    const { user } = setup()
    const bell = await screen.findByRole('button', { name: 'Notificações — não foi possível atualizar' })
    await user.click(bell)
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar seus convites.')
    expect(screen.queryByRole('button', { name: 'Ver convite de IL Tech' })).not.toBeInTheDocument()
    vi.mocked(fetchMyInvitations).mockResolvedValue([invitation])
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('button', { name: 'Ver convite de IL Tech' })).toBeVisible()
  })
  it('shows realtime failure separately and retries the invitation channel', async () => {
    vi.mocked(subscribeToPrivateBroadcast).mockImplementation((_topic, _event, _refresh, status) => { status('disconnected'); return vi.fn() })
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: /1 convite pendente/ }))
    expect(screen.getByText(/Convites: Atualizações ao vivo indisponíveis/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Reconectar convites' }))
    expect(subscribeToPrivateBroadcast).toHaveBeenCalledTimes(2)
  })
  it('limits the preview while counting every pending invitation', async () => {
    vi.mocked(fetchMyInvitations).mockResolvedValue(Array.from({ length: 4 }, (_, index) => ({ ...invitation, id: `f1500000-0000-4000-8000-00000000000${index}`, workspace_name: `Empresa ${index}` })))
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: /4 convites pendentes/ }))
    expect(screen.getAllByRole('button', { name: /Ver convite de Empresa/ })).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Ver todos os 4 convites' }))
    expect(await screen.findByLabelText('Destino do convite')).toHaveTextContent('/companies')
  })
})
