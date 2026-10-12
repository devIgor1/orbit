import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { GithubLinkForm } from '@/features/github/components/github-link-form'
import { AppError } from '@/lib/errors/app-error'
import type { GithubReferencePage } from '@/features/github/schemas/github-reference-schema'

const backend = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('@/features/github/services/github-references', () => ({ fetchGithubReferences: backend.fetch }))
vi.mock('@/features/workspace/use-query-scope', () => ({
  useQueryScope: () => ({
    userId: 'user',
    workspaceId: 'workspace',
    enabled: true,
    requireScope: () => ({ userId: 'user', workspaceId: 'workspace' }),
  }),
}))
const branches: GithubReferencePage = { kind: 'branch', items: [{ name: 'feat/login' }], nextPage: null }
const props = {
  taskId: 'task',
  repositoryId: 'repo',
  repositoryName: 'org/repo',
  isPending: false,
  error: null,
  onSubmit: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  backend.fetch.mockReset().mockResolvedValue(branches)
})
function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={cache}>{children}</QueryClientProvider>
  )
  return { user: userEvent.setup(), ...render(<GithubLinkForm {...props} />, { wrapper }) }
}
async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string | RegExp) {
  await user.click(await screen.findByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}
it('selects a real branch, preserves it after a refused write and prevents duplicate submissions', async () => {
  const { user, rerender } = setup()
  expect(screen.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await choose(user, 'Branch de trabalho', 'feat/login')
  await user.click(screen.getByRole('button', { name: 'Vincular à tarefa' }))
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ kind: 'branch', reference: 'feat/login' }))
  rerender(<GithubLinkForm {...props} error={new AppError('permission', 'Acesso recusado.')} />)
  expect(screen.getByRole('combobox', { name: 'Branch de trabalho' })).toHaveTextContent('feat/login')
  expect(screen.getByRole('alert')).toHaveTextContent('Acesso recusado.')
  rerender(<GithubLinkForm {...props} isPending />)
  expect(screen.getByRole('combobox', { name: 'Branch de trabalho' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Validando no GitHub…' })).toBeDisabled()
})
it('resets selection on type/status changes and warns before linking an already merged PR', async () => {
  backend.fetch.mockImplementation(async ({ kind, state }) =>
    kind === 'branch'
      ? branches
      : {
          kind: 'pr',
          nextPage: null,
          items: [
            {
              number: 42,
              title: 'Login',
              branch: 'feat/login',
              baseBranch: 'main',
              headRepository: 'contributor/fork',
              state: state === 'closed' ? 'merged' : 'draft',
            },
          ],
        },
  )
  const { user } = setup()
  await choose(user, 'Branch de trabalho', 'feat/login')
  await choose(user, 'Vincular por', 'Pull request')
  expect(screen.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await choose(user, 'Pull request', /#42.*Rascunho/)
  expect(screen.getByText(/contributor\/fork: feat\/login/)).toBeVisible()
  await choose(user, 'Status dos PRs', 'Fechados e integrados')
  expect(screen.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await choose(user, 'Pull request', /#42.*Integrado/)
  expect(screen.getByText(/Este PR já foi integrado/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Vincular à tarefa' }))
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ kind: 'pr', reference: '42' }))
})
it('shows a retryable error rather than an empty list or a usable stale selection', async () => {
  const { user } = setup()
  await choose(user, 'Branch de trabalho', 'feat/login')
  backend.fetch.mockRejectedValueOnce(new AppError('network', 'Falha ao consultar o GitHub.'))
  await user.click(screen.getByRole('button', { name: 'Atualizar opções' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao consultar o GitHub.')
  expect(screen.queryByText('Nenhuma branch de trabalho')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('combobox', { name: 'Branch de trabalho' })).toHaveTextContent('feat/login')
})
it('distinguishes loading from a successful empty response', async () => {
  let resolve!: (page: GithubReferencePage) => void
  backend.fetch.mockReturnValue(
    new Promise<GithubReferencePage>((done) => {
      resolve = done
    }),
  )
  setup()
  expect(screen.getByRole('status')).toHaveTextContent('Buscando branches')
  expect(screen.queryByText('Nenhuma branch de trabalho')).not.toBeInTheDocument()
  await act(async () => resolve({ kind: 'branch', items: [], nextPage: null }))
  expect(await screen.findByText('Nenhuma branch de trabalho')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
})
it('paginates, retries a failed next page and filters without allowing arbitrary reference values', async () => {
  backend.fetch
    .mockResolvedValueOnce({ ...branches, nextPage: 2 })
    .mockRejectedValueOnce(new AppError('network', 'Falha na próxima página.'))
    .mockResolvedValue({ kind: 'branch', items: [{ name: 'feat/paginated' }], nextPage: null })
  const { user } = setup()
  await user.click(await screen.findByRole('button', { name: 'Carregar mais opções' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha na próxima página.')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await user.type(await screen.findByLabelText('Filtrar branches carregadas'), 'paginated')
  expect(screen.getByRole('button', { name: 'Vincular à tarefa' })).toBeDisabled()
  await choose(user, 'Branch de trabalho', 'feat/paginated')
  await user.click(screen.getByRole('button', { name: 'Vincular à tarefa' }))
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ kind: 'branch', reference: 'feat/paginated' }))
  expect(backend.fetch).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 2, repositoryId: 'repo', taskId: 'task' }),
    expect.any(AbortSignal),
  )
})
it('does not show a late response from a previously selected repository', async () => {
  let resolve!: (page: GithubReferencePage) => void
  backend.fetch
    .mockReturnValueOnce(
      new Promise<GithubReferencePage>((done) => {
        resolve = done
      }),
    )
    .mockResolvedValue({ kind: 'branch', items: [{ name: 'feat/new-repo' }], nextPage: null })
  const { user, rerender } = setup()
  rerender(<GithubLinkForm key="other-repo" {...props} repositoryId="other-repo" />)
  await choose(user, 'Branch de trabalho', 'feat/new-repo')
  await act(async () => resolve(branches))
  expect(screen.getByRole('combobox', { name: 'Branch de trabalho' })).toHaveTextContent('feat/new-repo')
  await user.click(screen.getByRole('combobox', { name: 'Branch de trabalho' }))
  expect(screen.queryByRole('option', { name: 'feat/login' })).not.toBeInTheDocument()
})
