import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { TrashList } from '@/features/trash/components/trash-list'
import { TaskDelete } from '@/features/tasks/components/task-delete'
import { CompanyDeleteForm } from '@/features/companies/components/company-delete-form'
import { AppError } from '@/lib/errors/app-error'
import type { Trash } from '@/features/trash/services/trash-service'

const backend = vi.hoisted(() => ({ change: vi.fn() }))
vi.mock('@/features/trash/services/trash-service', () => ({ changeTrash: backend.change }))
vi.mock('@/features/workspace/use-query-scope', () => ({
  useQueryScope: () => ({
    userId: 'user',
    workspaceId: 'workspace',
    enabled: true,
    requireScope: () => ({ userId: 'user', workspaceId: 'workspace' }),
  }),
}))
const soon = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()
const trash: Trash = {
  projects: [
    { id: 'p1', title: 'Site novo', deleted_at: soon(-1), deleted_by: 'Ana', purge_at: soon(14), task_count: 3 },
  ],
  tasks: [
    {
      id: 't1',
      title: 'Revisar textos',
      deleted_at: soon(-14),
      deleted_by: null,
      purge_at: soon(0.5),
      project_id: 'p2',
      project_title: 'Weorbit',
    },
  ],
}
beforeEach(() => {
  backend.change.mockReset().mockResolvedValue(undefined)
})
function renderWith(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

it('lists projects with their tasks and individual tasks with the time left', () => {
  renderWith(<TrashList trash={trash} />)
  expect(screen.getByText('Site novo')).toBeVisible()
  expect(screen.getByText('3 tarefas junto com o projeto')).toBeVisible()
  expect(screen.getByText(/por Ana/)).toHaveTextContent('Excluído definitivamente em 14 dias')
  expect(screen.getByText('Projeto: Weorbit')).toBeVisible()
  expect(screen.getByText(/Será excluído em breve|Excluído definitivamente em 1 dia/)).toBeVisible()
})
it('restores an item', async () => {
  const user = renderWith(<TrashList trash={trash} />)
  await user.click(screen.getByRole('button', { name: 'Restaurar Site novo' }))
  await waitFor(() => expect(backend.change).toHaveBeenCalledWith('workspace', 'project', 'restore', 'p1'))
})
it('asks for confirmation before deleting permanently', async () => {
  const user = renderWith(<TrashList trash={trash} />)
  await user.click(screen.getByRole('button', { name: 'Excluir Revisar textos definitivamente' }))
  expect(backend.change).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Excluir para sempre' }))
  await waitFor(() => expect(backend.change).toHaveBeenCalledWith('workspace', 'task', 'purge', 't1'))
})
it('shows refused changes', async () => {
  backend.change.mockImplementation(async () => {
    throw new AppError('contract', 'Restaure o projeto desta tarefa antes de restaurá-la.')
  })
  const user = renderWith(<TrashList trash={trash} />)
  await user.click(screen.getByRole('button', { name: 'Restaurar Revisar textos' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Restaure o projeto')
})
it('explains the empty trash', () => {
  renderWith(<TrashList trash={{ projects: [], tasks: [] }} />)
  expect(screen.getByText('A lixeira está vazia')).toBeVisible()
})
it('moves a task to the trash only after confirming', async () => {
  const onDeleted = vi.fn()
  const user = renderWith(<TaskDelete taskId="t9" onDeleted={onDeleted} />)
  await user.click(screen.getByRole('button', { name: 'Excluir tarefa' }))
  expect(backend.change).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Mover para a lixeira' }))
  await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  expect(backend.change).toHaveBeenCalledWith('workspace', 'task', 'delete', 't9')
})
it('keeps the task open when deletion fails', async () => {
  backend.change.mockImplementation(async () => {
    throw new AppError('permission', 'Você não tem permissão para realizar esta ação.')
  })
  const onDeleted = vi.fn()
  const user = renderWith(<TaskDelete taskId="t9" onDeleted={onDeleted} />)
  await user.click(screen.getByRole('button', { name: 'Excluir tarefa' }))
  await user.click(screen.getByRole('button', { name: 'Mover para a lixeira' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('permissão')
  expect(onDeleted).not.toHaveBeenCalled()
})
it('requires the exact company name before deleting it', async () => {
  const onConfirm = vi.fn()
  const user = renderWith(
    <CompanyDeleteForm
      name="Estúdio Criativo"
      isPending={false}
      error={null}
      onConfirm={onConfirm}
      onCancel={vi.fn()}
    />,
  )
  const submit = screen.getByRole('button', { name: 'Excluir empresa' })
  expect(submit).toBeDisabled()
  await user.type(screen.getByLabelText(/para confirmar/), 'Estúdio')
  expect(submit).toBeDisabled()
  await user.type(screen.getByLabelText(/para confirmar/), ' Criativo ')
  expect(submit).toBeEnabled()
  await user.click(submit)
  expect(onConfirm).toHaveBeenCalledWith('Estúdio Criativo')
})
