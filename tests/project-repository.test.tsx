import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { ProjectRepository } from '@/features/github/components/project-repository'
import { AppError } from '@/lib/errors/app-error'

const backend = vi.hoisted(() => ({ repositories: vi.fn(), project: vi.fn(), set: vi.fn(), clear: vi.fn() }))
vi.mock('@/features/github/services/github-service', () => ({ fetchGithubRepositories: backend.repositories }))
vi.mock('@/features/github/services/project-repository-service', () => ({
  fetchProjectRepository: backend.project,
  setProjectRepository: backend.set,
  clearProjectRepository: backend.clear,
}))
vi.mock('@/features/workspace/use-query-scope', () => ({
  useQueryScope: () => ({
    userId: 'user',
    workspaceId: 'workspace',
    enabled: true,
    requireScope: () => ({ userId: 'user', workspaceId: 'workspace' }),
  }),
}))
const orbit = { id: 'orbit', full_name: 'devIgor1/orbit', github_id: 10, active: true }
const site = { id: 'site', full_name: 'org/site', github_id: 11, active: true }
beforeEach(() => {
  vi.resetAllMocks()
  backend.repositories.mockResolvedValue([orbit, site])
  backend.project.mockResolvedValue(null)
})
function setup(canManage = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProjectRepository projectId="weorbit" canManage={canManage} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(await screen.findByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

it('links a connected repository to the project', async () => {
  const user = setup()
  expect(await screen.findByText(/Escolha o repositório deste projeto/)).toBeVisible()
  await choose(user, 'Repositório', 'devIgor1/orbit')
  await waitFor(() => expect(backend.set).toHaveBeenCalledWith('workspace', 'weorbit', 'orbit'))
})
it('shows the linked repository and allows removing it', async () => {
  backend.project.mockResolvedValue('orbit')
  const user = setup()
  expect(await screen.findByRole('link', { name: 'devIgor1/orbit' })).toHaveAttribute(
    'href',
    'https://github.com/devIgor1/orbit',
  )
  await choose(user, 'Trocar repositório', 'Sem repositório')
  await waitFor(() => expect(backend.clear).toHaveBeenCalledWith('workspace', 'weorbit'))
})
it('is read-only for members', async () => {
  backend.project.mockResolvedValue('orbit')
  setup(false)
  expect(await screen.findByRole('link', { name: 'devIgor1/orbit' })).toBeVisible()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
})
it('points admins to settings when no repository is connected', async () => {
  backend.repositories.mockResolvedValue([])
  setup()
  expect(await screen.findByRole('link', { name: 'Conecte nas configurações' })).toHaveAttribute('href', '/settings')
})
it('keeps the current repository visible when a change is refused', async () => {
  backend.project.mockResolvedValue('orbit')
  backend.set.mockRejectedValue(new AppError('permission', 'Alteração recusada.'))
  const user = setup()
  await choose(user, 'Trocar repositório', 'org/site')
  expect(await screen.findByText('Alteração recusada.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'devIgor1/orbit' })).toBeVisible()
})
