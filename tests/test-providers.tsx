import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '@/features/auth/auth-context'

export const testAuth: AuthContextValue = {
  user: { id: 'user-1', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' },
  loading: false, error: null, configured: true,
  signIn: async () => {}, signOut: async () => {},
}

export function createTestClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

export function TestProviders({ children, client, auth = testAuth, initialEntries }: { children: ReactNode; client: QueryClient; auth?: AuthContextValue; initialEntries?: string[] }) {
  return <QueryClientProvider client={client}><AuthContext.Provider value={auth}><MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter></AuthContext.Provider></QueryClientProvider>
}

export const testProfile = {
  active_workspace_id: null,
  id: 'user-1', full_name: 'Pessoa de teste', avatar_url: null, job_title: 'Designer', created_at: '2026-01-01T00:00:00Z',
}

export const testWorkspace = {
  workspace: { id: 'workspace-1', name: 'Estúdio de teste', created_at: '2026-01-01T00:00:00Z' },
  role: 'admin' as const, profile: testProfile,
}
