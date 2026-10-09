import { act, render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/features/auth/auth-provider'
import { useAuth } from '@/features/auth/use-auth'
import { queryClient } from '@/lib/query/query-client'
import { AppError } from '@/lib/errors/app-error'

const auth = vi.hoisted(() => {
  const state: { listener: ((event: string, session: { user: User } | null) => void) | null } = { listener: null }
  return {
    state,
    getSession: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((listener: NonNullable<typeof state.listener>) => {
      state.listener = listener
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
  }
})

vi.mock('@/lib/supabase/client', () => ({ isSupabaseConfigured: true, getSupabase: () => ({ auth }) }))

function SessionObserver() {
  const session = useAuth()
  return <><span data-testid="identity">{session.user?.id ?? 'anonymous'}</span>{session.loading && <p role="status">Restaurando sessão</p>}{session.error && <p role="alert">{session.error.message}</p>}</>
}

const member = (id: string): User => ({ id, app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' })

beforeEach(() => {
  queryClient.clear()
  auth.state.listener = null
  auth.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null })
  auth.signOut.mockReset().mockResolvedValue({ error: null })
})

describe('Sessão e isolamento do cache', () => {
  it('limpa dados privados quando a identidade muda e quando a sessão termina', async () => {
    render(<AuthProvider><SessionObserver /></AuthProvider>)
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    act(() => auth.state.listener?.('SIGNED_IN', { user: member('member-a') }))
    queryClient.setQueryData(['projects', 'member-a', 'workspace-a'], { private: 'test-only' })
    act(() => auth.state.listener?.('SIGNED_IN', { user: member('member-b') }))
    expect(screen.getByTestId('identity')).toHaveTextContent('member-b')
    expect(queryClient.getQueryData(['projects', 'member-a', 'workspace-a'])).toBeUndefined()
    queryClient.setQueryData(['projects', 'member-b', 'workspace-b'], { private: 'test-only' })
    act(() => auth.state.listener?.('SIGNED_OUT', null))
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous')
    expect(queryClient.getQueryData(['projects', 'member-b', 'workspace-b'])).toBeUndefined()
  })

  it('apresenta sessão expirada como erro de autenticação', async () => {
    auth.getSession.mockResolvedValue({ data: { session: null }, error: { status: 401 } })
    render(<AuthProvider><SessionObserver /></AuthProvider>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão expirou.')
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('não deixa restauração antiga sobrescrever um login mais recente', async () => {
    let finishRestoration: ((value: { data: { session: null }; error: null }) => void) | undefined
    auth.getSession.mockReturnValue(new Promise(resolve => { finishRestoration = resolve }))
    render(<AuthProvider><SessionObserver /></AuthProvider>)
    act(() => auth.state.listener?.('SIGNED_IN', { user: member('recent-user') }))
    await act(async () => finishRestoration?.({ data: { session: null }, error: null }))
    expect(screen.getByTestId('identity')).toHaveTextContent('recent-user')
  })

  it('encerra sessão e limpa dados privados quando a API reporta expiração', async () => {
    render(<AuthProvider><SessionObserver /></AuthProvider>)
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
    act(() => auth.state.listener?.('SIGNED_IN', { user: member('member-a') }))
    queryClient.setQueryData(['private', 'member-a'], { private: 'test-only' })
    await act(async () => {
      await expect(queryClient.fetchQuery({ queryKey: ['expired-session'], retry: false, queryFn: async () => { throw new AppError('authentication', 'Sua sessão expirou.') } })).rejects.toMatchObject({ kind: 'authentication' })
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão expirou.')
    expect(screen.getByTestId('identity')).toHaveTextContent('anonymous')
    expect(queryClient.getQueryData(['private', 'member-a'])).toBeUndefined()
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
