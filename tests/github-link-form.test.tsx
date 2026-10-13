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
const repositoryId = 'ad000000-0000-4000-8000-000000000001'
const otherRepositoryId = 'ad000000-0000-4000-8000-000000000002'
const pull = {
  number: 42,
  title: 'Login',
  branch: 'feat/login',
  baseBranch: 'main',
  headRepository: 'contributor/fork',
  state: 'draft' as const,
}
const pulls: GithubReferencePage = { kind: 'pr', items: [pull], nextPage: null }
const props = {
  taskId: 'task',
  repositories: [
    { id: repositoryId, full_name: 'org/repo' },
    { id: otherRepositoryId, full_name: 'org/other' },
  ],
  isPending: false,
  error: null,
  onSubmit: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  backend.fetch.mockReset().mockResolvedValue(pulls)
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
const submit = () => screen.getByRole('button', { name: 'Vincular PR à tarefa' })

it('requires a repository selected on the task before loading PRs or allowing submission', async () => {
  const { user } = setup()
  expect(submit()).toBeDisabled()
  expect(backend.fetch).not.toHaveBeenCalled()
  expect(screen.queryByRole('combobox', { name: 'Vincular por' })).not.toBeInTheDocument()
  await choose(user, 'Repositório do PR', 'org/repo')
  await choose(user, 'Pull request', /#42.*Rascunho/)
  await user.click(submit())
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ repositoryId, reference: '42' }))
  expect(backend.fetch).toHaveBeenCalledWith(
    expect.objectContaining({ repositoryId, taskId: 'task', kind: 'pr' }),
    expect.any(AbortSignal),
  )
})
it('preserves repository and PR after a refused write and blocks duplicate submissions', async () => {
  const { user, rerender } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  await choose(user, 'Pull request', /#42/)
  await user.click(submit())
  rerender(<GithubLinkForm {...props} error={new AppError('permission', 'Acesso recusado.')} />)
  expect(screen.getByRole('combobox', { name: 'Pull request' })).toHaveTextContent('#42')
  expect(screen.getByRole('combobox', { name: 'Repositório do PR' })).toHaveTextContent('org/repo')
  expect(screen.getByRole('alert')).toHaveTextContent('Acesso recusado.')
  rerender(<GithubLinkForm {...props} isPending />)
  expect(screen.getByRole('combobox', { name: 'Pull request' })).toBeDisabled()
  expect(screen.getByRole('combobox', { name: 'Repositório do PR' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Validando no GitHub…' })).toBeDisabled()
})
it('resets the PR when changing repository even when both contain the same PR number', async () => {
  const { user } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  await choose(user, 'Pull request', /#42/)
  await choose(user, 'Repositório do PR', 'org/other')
  expect(submit()).toBeDisabled()
  await choose(user, 'Pull request', /#42/)
  await user.click(submit())
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ repositoryId: otherRepositoryId, reference: '42' }))
})
it('resets selection on status changes and warns before linking an already merged PR', async () => {
  backend.fetch.mockImplementation(async ({ state }) => ({
    ...pulls,
    items: [{ ...pull, state: state === 'closed' ? 'merged' : 'draft' }],
  }))
  const { user } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  await choose(user, 'Pull request', /#42.*Rascunho/)
  expect(screen.getByText(/contributor\/fork: feat\/login/)).toBeVisible()
  await choose(user, 'Status dos PRs', 'Fechados e integrados')
  expect(submit()).toBeDisabled()
  await choose(user, 'Pull request', /#42.*Integrado/)
  expect(screen.getByText(/Este PR já foi integrado/)).toBeVisible()
})
it('shows retryable query failures and blocks stale selections until recovery', async () => {
  const { user } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  await choose(user, 'Pull request', /#42/)
  backend.fetch.mockRejectedValueOnce(new AppError('network', 'Falha ao consultar o GitHub.'))
  await user.click(screen.getByRole('button', { name: 'Atualizar opções' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao consultar o GitHub.')
  expect(screen.queryByText('Nenhum PR encontrado')).not.toBeInTheDocument()
  expect(submit()).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByRole('combobox', { name: 'Pull request' })).toHaveTextContent('#42')
})
it('distinguishes loading from a successful empty response', async () => {
  let resolve!: (page: GithubReferencePage) => void
  backend.fetch.mockReturnValue(
    new Promise<GithubReferencePage>((done) => {
      resolve = done
    }),
  )
  const { user } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  expect(screen.getByRole('status')).toHaveTextContent('Buscando PRs')
  expect(screen.queryByText('Nenhum PR encontrado')).not.toBeInTheDocument()
  await act(async () => resolve({ kind: 'pr', items: [], nextPage: null }))
  expect(await screen.findByText('Nenhum PR encontrado')).toBeVisible()
  expect(submit()).toBeDisabled()
})
it('paginates, retries and filters without accepting arbitrary PRs', async () => {
  backend.fetch
    .mockResolvedValueOnce({ ...pulls, nextPage: 2 })
    .mockRejectedValueOnce(new AppError('network', 'Falha na próxima página.'))
    .mockResolvedValue({ ...pulls, items: [{ ...pull, number: 99 }] })
  const { user } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  await user.click(await screen.findByRole('button', { name: 'Carregar mais opções' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Falha na próxima página.')
  await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await user.type(await screen.findByLabelText('Filtrar PRs carregados'), '99')
  expect(submit()).toBeDisabled()
  await choose(user, 'Pull request', /#99/)
  await user.click(submit())
  await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith({ repositoryId, reference: '99' }))
})
it('ignores a late response from a previously selected repository', async () => {
  let resolve!: (page: GithubReferencePage) => void
  backend.fetch
    .mockReturnValueOnce(
      new Promise<GithubReferencePage>((done) => {
        resolve = done
      }),
    )
    .mockResolvedValue({ ...pulls, items: [{ ...pull, number: 99 }] })
  const { user } = setup()
  await choose(user, 'Repositório do PR', 'org/repo')
  await choose(user, 'Repositório do PR', 'org/other')
  await choose(user, 'Pull request', /#99/)
  await act(async () => resolve(pulls))
  expect(screen.getByRole('combobox', { name: 'Pull request' })).toHaveTextContent('#99')
  await user.click(screen.getByRole('combobox', { name: 'Pull request' }))
  expect(screen.queryByRole('option', { name: /#42/ })).not.toBeInTheDocument()
})
