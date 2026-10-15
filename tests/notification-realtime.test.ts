import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subscribeToNotifications } from '@/features/notifications/services/notification-realtime'

const backend = vi.hoisted(() => ({ realtime: { setAuth: vi.fn() }, channel: vi.fn(), removeChannel: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => backend }))
beforeEach(() => { vi.resetAllMocks(); backend.realtime.setAuth.mockResolvedValue(undefined); backend.removeChannel.mockResolvedValue('ok') })

describe('Private realtime lifecycle', () => {
  it('refreshes after joining, events and reconnection, and ignores events after cleanup', async () => {
    const channel = { on: vi.fn(), subscribe: vi.fn() }
    channel.on.mockReturnValue(channel); channel.subscribe.mockReturnValue(channel)
    backend.channel.mockReturnValue(channel)
    const refresh = vi.fn(), connection = vi.fn()
    const stop = subscribeToNotifications('workspace', 'user', refresh, connection)
    await Promise.resolve()
    expect(backend.channel).toHaveBeenCalledWith('notifications:workspace:user', { config: { private: true } })
    const event = channel.on.mock.calls[0][2]
    const status = channel.subscribe.mock.calls[0][0]
    status('SUBSCRIBED'); event(); status('CHANNEL_ERROR'); status('SUBSCRIBED')
    expect(refresh).toHaveBeenCalledTimes(3)
    expect(connection.mock.calls).toEqual([['connected'], ['disconnected'], ['connected']])
    stop(); event(); status('CLOSED')
    expect(backend.removeChannel).toHaveBeenCalledWith(channel)
    expect(refresh).toHaveBeenCalledTimes(3)
    expect(connection).toHaveBeenCalledTimes(3)
  })
  it('does not create a channel after unmount during authentication', async () => {
    const stop = subscribeToNotifications('workspace', 'user', vi.fn(), vi.fn())
    stop(); await Promise.resolve()
    expect(backend.channel).not.toHaveBeenCalled()
  })
  it('surfaces authentication setup failure as an unavailable connection', async () => {
    backend.realtime.setAuth.mockRejectedValue(new Error('Socket auth unavailable'))
    const connection = vi.fn()
    subscribeToNotifications('workspace', 'user', vi.fn(), connection)
    await vi.waitFor(() => expect(connection).toHaveBeenCalledWith('disconnected'))
    expect(backend.channel).not.toHaveBeenCalled()
  })
})
