import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OptionsSelect } from '@/components/shared/options-select'
import { TaskStatusSelect } from '@/features/tasks/components/task-status-select'

describe('Select shadcn Base UI', () => {
  it('mantém o último status confirmado enquanto a mudança aguarda o backend', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    const task = { title: 'Tarefa de teste', status: 'todo' as const }
    const { rerender } = render(<TaskStatusSelect task={task} disabled={false} onValueChange={change} />)
    const trigger = screen.getByRole('combobox', { name: 'Status de Tarefa de teste' })
    trigger.focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('option', { name: 'Concluído', exact: true }))
    expect(change).toHaveBeenCalledWith('done')
    expect(trigger).toHaveTextContent('A fazer')
    rerender(<TaskStatusSelect task={task} disabled onValueChange={change} />)
    expect(trigger).toBeDisabled()
    rerender(<TaskStatusSelect task={{ ...task, status: 'done' }} disabled={false} onValueChange={change} />)
    expect(trigger).toHaveTextContent('Concluído')
  })

  it('seleciona e remove um responsável, mantendo o valor vazio no formulário', async () => {
    const user = userEvent.setup()
    const submit = vi.fn()
    function Form() {
      const [value, setValue] = useState('member-test')
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit(new FormData(event.currentTarget).get('assignee_id'))
          }}
        >
          <label htmlFor="assignee">Responsável</label>
          <OptionsSelect
            id="assignee"
            name="assignee_id"
            value={value}
            onValueChange={setValue}
            items={[
              { value: '', label: 'Sem responsável' },
              { value: 'member-test', label: 'Pessoa de teste' },
            ]}
          />
          <button type="submit">Salvar</button>
        </form>
      )
    }
    render(<Form />)
    screen.getByRole('combobox', { name: 'Responsável' }).focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('option', { name: 'Sem responsável' }))
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith(''))
  })

  it('ignora opções indisponíveis na navegação por teclado', async () => {
    const user = userEvent.setup()
    const change = vi.fn()
    render(
      <OptionsSelect
        aria-label="Etapa"
        value="todo"
        onValueChange={change}
        items={[
          { value: 'todo', label: 'A fazer' },
          { value: 'review', label: 'Em revisão', disabled: true },
          { value: 'done', label: 'Concluído' },
        ]}
      />,
    )
    screen.getByRole('combobox', { name: 'Etapa' }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('option', { name: 'Em revisão' })).toHaveAttribute('aria-disabled', 'true')
    await user.keyboard('{End}{Enter}')
    expect(change).toHaveBeenCalledWith('done')
  })
})
