import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { TaskGithub } from '@/features/github/components/task-github'
import type { Database, Task } from '@/lib/supabase/database.types'
import { AppError } from '@/lib/errors/app-error'

const backend = vi.hoisted(() => ({ repositories: vi.fn(), link: vi.fn(), change: vi.fn() }))
vi.mock('@/features/github/services/github-service', () => ({
  fetchGithubRepositories: backend.repositories,
  fetchTaskGithub: backend.link,
  changeTaskGithub: backend.change,
}))
vi.mock('@/features/workspace/use-query-scope', () => ({
  useQueryScope: () => ({
    userId: 'user',
    workspaceId: 'workspace',
    enabled: true,
    requireScope: () => ({ userId: 'user', workspaceId: 'workspace' }),
  }),
}))
const task: Task = {
  id: 'task',
  workspace_id: 'workspace',
  project_id: 'project',
  title: 'Task',
  description: null,
  priority: 'medium',
  status: 'todo',
  assignee_id: null,
  due_date: null,
  completed_at: null,
  created_by: 'user',
  created_at: '2026-10-13',
  updated_at: '2026-10-13',
}
const repository = { id: 'repo', full_name: 'org/repo', github_id: 10, active: true }
const link: Database['public']['Tables']['task_github_links']['Row'] = {
  id: 'link',
  task_id: task.id,
  project_id: task.project_id,
  workspace_id: task.workspace_id,
  repository_id: repository.id,
  branch: 'feat/work',
  head_repository_id: 10,
  pr_number: 42,
  pr_title: 'Entrega',
  pr_state: 'open',
  merged_at: null,
  sync_status: 'synced',
  last_error_code: null,
  last_synced_at: null,
  comment_status: 'not_due',
  comment_id: null,
  created_by: 'user',
  created_at: '2026-10-13',
}
beforeEach(() => {
  vi.resetAllMocks()
  backend.repositories.mockResolvedValue([repository])
  backend.link.mockResolvedValue(null)
})
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TaskGithub task={task} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}
it('offers configuration only after a successful response with no active repositories', async () => {
  backend.repositories.mockResolvedValue([{ ...repository, active: false }])
  setup()
  expect(await screen.findByText('Nenhum repositório disponível')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Abrir configurações' })).toHaveAttribute('href', '/settings')
})
it('shows backend failures rather than treating them as no repository or no link', async () => {
  backend.repositories.mockRejectedValue(new AppError('network', 'Rede indisponível.'))
  setup()
  expect(await screen.findByRole('alert')).toHaveTextContent('Rede indisponível.')
  expect(screen.queryByText('Nenhum repositório disponível')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Vincular PR à tarefa' })).not.toBeInTheDocument()
})
it('resolves an existing PR using its own repository instead of another repository in the company', async () => {
  backend.repositories.mockResolvedValue([{ ...repository, id: 'other', full_name: 'org/other' }, repository])
  backend.link.mockResolvedValue(link)
  setup()
  expect(await screen.findByRole('link', { name: '#42 Entrega' })).toHaveAttribute(
    'href',
    'https://github.com/org/repo/pull/42',
  )
})
it('keeps legacy branch links visible', async () => {
  backend.link.mockResolvedValue({ ...link, pr_number: null, pr_title: null, pr_state: 'branch' })
  setup()
  expect(await screen.findByText('Branch vinculada')).toBeVisible()
  expect(screen.getByRole('link', { name: 'feat/work' })).toHaveAttribute(
    'href',
    'https://github.com/org/repo/tree/feat%2Fwork',
  )
})
it('allows removal of an unavailable repository link and reports failed writes', async () => {
  backend.repositories.mockResolvedValue([{ ...repository, active: false }])
  backend.link.mockResolvedValue(link)
  backend.change.mockRejectedValue(new AppError('permission', 'Escrita recusada.'))
  const user = setup()
  expect(await screen.findByRole('button', { name: 'Sincronizar' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Remover vínculo' }))
  await waitFor(() => expect(backend.change).toHaveBeenCalledWith('workspace', 'task', 'unlink'))
  expect(await screen.findByText('Escrita recusada.')).toBeVisible()
  expect(screen.getByRole('link', { name: '#42 Entrega' })).toBeVisible()
})
it('treats a missing repository for a persisted link as an inconsistent response', async () => {
  backend.repositories.mockResolvedValue([])
  backend.link.mockResolvedValue(link)
  setup()
  expect(await screen.findByRole('alert')).toHaveTextContent('O repositório deste vínculo não foi encontrado.')
  expect(screen.queryByText('Nenhum repositório disponível')).not.toBeInTheDocument()
})
