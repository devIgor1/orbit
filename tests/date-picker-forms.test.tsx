import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProjectForm } from '@/features/projects/components/project-form'
import { TaskForm } from '@/features/tasks/components/task-form'
import type { Project, Task } from '@/lib/supabase/database.types'

const project: Project = {
  id: 'project-test',
  workspace_id: 'workspace-test',
  title: 'Prazo existente',
  description: '',
  status: 'active',
  due_date: '2028-02-29',
  created_by: 'user-test',
  created_at: '2026-10-08T12:00:00Z',
  updated_at: '2026-10-08T12:00:00Z',
}
const task: Task = {
  ...project,
  id: 'task-test',
  project_id: project.id,
  status: 'todo',
  priority: 'medium',
  assignee_id: null,
  completed_at: null,
}

describe.each(['project', 'task'])('Prazo ao editar %s', (kind) => {
  it('carrega a data salva, envia ISO e mantém a escolha quando o backend falha', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn<(values: { due_date: string }) => Promise<void>>().mockResolvedValue(undefined)
    function form(error: Error | null = null, isPending = false) {
      const props = { onSubmit, onCancel: vi.fn(), error, isPending }
      return kind === 'project' ? (
        <ProjectForm {...props} project={project} />
      ) : (
        <TaskForm {...props} task={task} members={[]} />
      )
    }
    const { rerender } = render(form())
    const trigger = screen.getByLabelText('Data de entrega')
    expect(trigger).toHaveTextContent('29/02/2028')
    await user.click(trigger)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /29 de fevereiro de 2028, selecionado/ })).toHaveFocus(),
    )
    await user.keyboard('{ArrowRight}{Enter}')
    expect(trigger).toHaveTextContent('01/03/2028')
    expect(onSubmit).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ due_date: '2028-03-01' }))

    rerender(form(new Error('Falha na atualização')))
    expect(screen.getByRole('alert')).toBeVisible()
    expect(trigger).toHaveTextContent('01/03/2028')
    rerender(form(null, true))
    expect(trigger).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  })
})
