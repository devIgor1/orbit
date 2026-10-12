import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { focusManager, onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { GithubCallbackPage } from '@/pages/github-callback-page'
import { AppError } from '@/lib/errors/app-error'

const authorize = vi.hoisted(() => vi.fn())
vi.mock('@/features/auth/use-auth', () => ({ useAuth: () => ({ user: { id: 'user' } }) }))
vi.mock('@/features/github/services/github-service', () => ({
  authorizeGithubConnection: authorize,
  completeGithubConnection: vi.fn(),
}))
afterEach(() => {
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
  vi.clearAllMocks()
})

it('preserves a failed one-time callback across remount, focus and reconnect without submitting it again', async () => {
  const cache = new QueryClient()
  const state = `account.${'a'.repeat(64)}`
  authorize.mockRejectedValue(new AppError('contract', 'Esta tentativa de conexão expirou.'))
  const view = (key: number) => (
    <MemoryRouter initialEntries={[`/settings/github/callback?state=${state}&installation_id=20&setup_action=update`]}>
      <QueryClientProvider client={cache}>
        <GithubCallbackPage key={key} />
      </QueryClientProvider>
    </MemoryRouter>
  )
  const page = render(view(1))
  expect(await screen.findByRole('alert')).toHaveTextContent('Esta tentativa de conexão expirou.')
  page.rerender(view(2))
  await act(async () => {
    focusManager.setFocused(false)
    onlineManager.setOnline(false)
    focusManager.setFocused(true)
    onlineManager.setOnline(true)
  })
  expect(screen.getByRole('alert')).toHaveTextContent('Esta tentativa de conexão expirou.')
  expect(authorize).toHaveBeenCalledExactlyOnceWith(state, 20)
  page.unmount()
  cache.clear()
})
