import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotificationCenter } from '@/features/notifications/components/notification-center'
import * as service from '@/features/notifications/services/notification-service'
import { subscribeToNotifications } from '@/features/notifications/services/notification-realtime'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testWorkspace } from './test-providers'
import { notification, notificationPage } from './fixtures/notifications'
import { fetchMyInvitations } from '@/features/companies/services/invitation-service'
import { subscribeToPrivateBroadcast } from '@/lib/supabase/private-broadcast'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/notifications/services/notification-service', () => ({ fetchNotifications: vi.fn(), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn() }))
vi.mock('@/features/notifications/services/notification-realtime', () => ({ subscribeToNotifications: vi.fn() }))
vi.mock('@/features/companies/services/invitation-service', () => ({ fetchMyInvitations: vi.fn() }))
vi.mock('@/lib/supabase/private-broadcast', () => ({ subscribeToPrivateBroadcast: vi.fn() }))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(fetchWorkspace).mockResolvedValue(testWorkspace)
  vi.mocked(service.fetchNotifications).mockResolvedValue(notificationPage)
  vi.mocked(fetchMyInvitations).mockResolvedValue([])
  vi.mocked(subscribeToPrivateBroadcast).mockImplementation((_topic, _event, _refresh, status) => { status('connected'); return vi.fn() })
  vi.mocked(subscribeToNotifications).mockImplementation((_workspace, _user, _refresh, status) => { status('connected'); return vi.fn() })
})
function setup() {
  const client = createTestClient()
  render(<TestProviders client={client}><NotificationCenter /></TestProviders>)
  return { client, user: userEvent.setup() }
}

describe('Notifications inbox', () => {
  it('shows a badge while closed, opens by keyboard and restores focus on Escape', async () => {
    const { user } = setup()
    const bell = await screen.findByRole('button', { name: 'Notificações — 1 não lidas' })
    bell.focus(); await user.keyboard('{Enter}')
    expect(await screen.findByRole('dialog', { name: 'Notificações' })).toBeVisible()
    expect(screen.getByText('Marina Costa')).toBeVisible()
    await user.keyboard('{Escape}')
    expect(bell).toHaveFocus()
  })
  it('distinguishes loading, confirmed empty and query failure', async () => {
    vi.mocked(service.fetchNotifications).mockResolvedValue({ ...notificationPage, items: [], unread_count: 0 })
    const { user, client } = setup()
    expect(screen.getByRole('button', { name: 'Notificações — carregando' })).toBeVisible()
    const bell = await screen.findByRole('button', { name: 'Notificações — 0 não lidas' })
    await user.click(bell)
    expect(screen.getByText('Sua órbita está tranquila')).toBeVisible()
    vi.mocked(service.fetchNotifications).mockRejectedValue(new AppError('network', 'Não foi possível conectar ao servidor.'))
    await act(() => client.invalidateQueries({ queryKey: ['notifications'] }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar')
    expect(screen.queryByText('Sua órbita está tranquila')).not.toBeInTheDocument()
    expect(bell).toHaveAttribute('aria-label', 'Notificações — não foi possível atualizar')
  })
  it('keeps a failed read visible as an error and restores the unread item after retry', async () => {
    vi.mocked(service.markNotificationRead).mockRejectedValue(new AppError('permission', 'Leitura não autorizada.'))
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Notificações — 1 não lidas' }))
    await user.click(screen.getByRole('button', { name: 'Marcar como lida' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Leitura não autorizada')
    expect(screen.queryByRole('button', { name: notification.task_title })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByRole('button', { name: 'Marcar como lida' })).toBeVisible()
  })
  it('updates the count only after persisted read and refetch', async () => {
    const { user } = setup()
    const bell = await screen.findByRole('button', { name: 'Notificações — 1 não lidas' })
    await user.click(bell)
    vi.mocked(service.markNotificationRead).mockResolvedValue({ ...notification, read_at: notificationPage.as_of })
    vi.mocked(service.fetchNotifications).mockResolvedValue({ ...notificationPage, unread_count: 0, items: [{ ...notification, read_at: notificationPage.as_of }] })
    await user.click(screen.getByRole('button', { name: 'Marcar como lida' }))
    await waitFor(() => expect(bell).toHaveAttribute('aria-label', 'Notificações — 0 não lidas'))
    expect(screen.queryByRole('button', { name: 'Marcar como lida' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: notification.task_title })).toBeVisible()
  })
  it('uses the server snapshot to mark all and keeps reconnect failure visible', async () => {
    vi.mocked(subscribeToNotifications).mockImplementation((_workspace, _user, _refresh, status) => { status('disconnected'); return vi.fn() })
    vi.mocked(service.markAllNotificationsRead).mockResolvedValue(1)
    const { user } = setup()
    await user.click(await screen.findByRole('button', { name: 'Notificações — 1 não lidas' }))
    expect(screen.getByText(/Atualizações ao vivo indisponíveis/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    expect(service.markAllNotificationsRead).toHaveBeenCalledWith({ workspaceId: 'workspace-1', userId: 'user-1' }, notificationPage.as_of)
  })
  it('refetches when another tab or actor emits a change', async () => {
    setup()
    await screen.findByRole('button', { name: 'Notificações — 1 não lidas' })
    vi.mocked(service.fetchNotifications).mockResolvedValue({ ...notificationPage, unread_count: 2 })
    await act(async () => { vi.mocked(subscribeToNotifications).mock.calls[0][2]() })
    expect(await screen.findByRole('button', { name: 'Notificações — 2 não lidas' })).toBeVisible()
  })
})
