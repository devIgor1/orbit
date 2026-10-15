import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompanyRenameForm } from '@/features/companies/components/company-rename-form'
import { ProjectForm } from '@/features/projects/components/project-form'
import { TaskForm } from '@/features/tasks/components/task-form'
import type { Project, Task } from '@/lib/supabase/database.types'

const project: Project = {
  id: 'project', workspace_id: 'workspace', title: 'Entrega existente', description: null,
  status: 'active', due_date: null, created_by: 'user', created_at: '2026-10-15',
  updated_at: '2026-10-15', deleted_at: null, deleted_by: null,
}
const task: Task = {
  ...project, id: 'task', project_id: project.id, status: 'todo', priority: 'medium',
  assignee_id: null, completed_at: null,
}
const kinds = ['company', 'project', 'task'] as const

describe.each(kinds)('Confirmed edits: %s', kind => {
  function setup() {
    const onSubmit = vi.fn<(values: unknown) => Promise<void>>().mockResolvedValue(undefined)
    function form(title = project.title, error: Error | null = null, isPending = false) {
      const props = { onSubmit, onCancel: vi.fn(), error, isPending }
      if (kind === 'company') return <CompanyRenameForm {...props} name={title} />
      if (kind === 'project') return <ProjectForm {...props} project={{ ...project, title }} />
      return <TaskForm {...props} task={{ ...task, title }} members={[]} />
    }
    const view = render(form())
    return {
      ...view, form, onSubmit, user: userEvent.setup(),
      field: screen.getByLabelText(/Nome da empresa|Nome do projeto|Nome da tarefa/),
      button: screen.getByRole('button', { name: /Salvar nome|Salvar alterações/ }),
    }
  }

  it('blocks unchanged submissions, reverted edits and whitespace-only changes', async () => {
    const { field, button, user, onSubmit } = setup()
    expect(button).toBeDisabled()
    const form = field.closest('form')
    if (!form) throw new Error('Expected an editing form')
    await act(async () => { fireEvent.submit(form) })
    expect(onSubmit).not.toHaveBeenCalled()
    await user.type(field, ' revisada')
    expect(button).toBeEnabled()
    await user.clear(field)
    await user.type(field, project.title)
    expect(button).toBeDisabled()
    await user.type(field, '  ')
    expect(button).toBeDisabled()
    await user.keyboard('{Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('preserves edits and retry after backend failure; only confirmed values disable saving', async () => {
    const { field, button, user, onSubmit, rerender, form } = setup()
    await user.clear(field)
    await user.type(field, 'Entrega revisada')
    await user.click(button)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    rerender(form(project.title, null, true))
    expect(button).toBeDisabled()
    rerender(form(project.title, new Error('Falha na atualização')))
    expect(field).toHaveValue('Entrega revisada')
    expect(button).toBeEnabled()
    expect(screen.getByRole('alert')).toBeVisible()
    await user.click(button)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    rerender(form('Entrega revisada'))
    expect(button).toBeDisabled()
    await user.type(field, ' novamente')
    expect(button).toBeEnabled()
    rerender(form('Entrega revisada'))
    expect(field).toHaveValue('Entrega revisada novamente')
    expect(button).toBeEnabled()
  })

  it('keeps validation for actual but invalid changes', async () => {
    const { field, button, user, onSubmit } = setup()
    await user.clear(field)
    await user.click(button)
    expect(await screen.findByText(/pelo menos .* caracteres/)).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('refreshes untouched values but preserves a draft when confirmed data changes', async () => {
    const { field, button, user, rerender, form } = setup()
    rerender(form('Nome atualizado pela equipe'))
    await waitFor(() => expect(field).toHaveValue('Nome atualizado pela equipe'))
    expect(button).toBeDisabled()
    await user.clear(field)
    await user.type(field, 'Minha edição em andamento')
    rerender(form('Outra alteração confirmada'))
    await waitFor(() => expect(field).toHaveValue('Minha edição em andamento'))
    expect(button).toBeEnabled()
  })
})

it.each(['project', 'task'])('still creates a new %s', async kind => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const props = { onSubmit, onCancel: vi.fn(), isPending: false, error: null }
  render(kind === 'project' ? <ProjectForm {...props} /> : <TaskForm {...props} members={[]} />)
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/Nome do projeto|Nome da tarefa/), 'Nova entrega')
  await user.click(screen.getByRole('button', { name: /Criar projeto|Criar tarefa/ }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nova entrega' })))
})
