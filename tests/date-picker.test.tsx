import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { format } from 'date-fns'
import { DatePicker } from '@/components/ui/date-picker'
import { Dialog } from '@/components/ui/dialog'

function Field({ initial = '2026-10-08', disabled = false }: { initial?: string; disabled?: boolean }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <label htmlFor="deadline">Data de entrega</label>
      <DatePicker id="deadline" value={value} onChange={setValue} disabled={disabled} />
      <output aria-label="Valor da data">{value}</output>
    </>
  )
}

describe('DatePicker shadcn compartilhado', () => {
  it('seleciona por teclado, preserva ISO e devolve o foco ao campo', async () => {
    const user = userEvent.setup()
    render(<Field />)
    const trigger = screen.getByLabelText('Data de entrega')
    expect(trigger).toHaveTextContent('08/10/2026')
    trigger.focus()
    await user.keyboard('{Enter}')
    const selected = screen.getByRole('button', { name: /8 de outubro de 2026.*selecionado/ })
    await waitFor(() => expect(selected).toHaveFocus())
    await user.keyboard('{ArrowRight}{Enter}')
    expect(screen.getByLabelText('Valor da data')).toHaveTextContent('2026-10-09')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('navega entre mês e ano em português sem alterar a data até selecionar', async () => {
    const user = userEvent.setup()
    render(<Field />)
    await user.click(screen.getByLabelText('Data de entrega'))
    screen.getByRole('combobox', { name: 'Ano', exact: true }).focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('option', { name: '2028', exact: true }))
    screen.getByRole('combobox', { name: 'Mês', exact: true }).focus()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('option', { name: /^fevereiro$/i }))
    expect(screen.getByLabelText('Valor da data')).toHaveTextContent('2026-10-08')
    await user.click(screen.getByRole('button', { name: /^terça-feira, 29 de fevereiro de 2028$/ }))
    expect(screen.getByLabelText('Valor da data')).toHaveTextContent('2028-02-29')
  })

  it('permite limpar um prazo e selecionar hoje', async () => {
    const user = userEvent.setup()
    render(<Field />)
    await user.click(screen.getByLabelText('Data de entrega'))
    await user.click(screen.getByRole('button', { name: 'Limpar data' }))
    expect(screen.getByLabelText('Valor da data')).toBeEmptyDOMElement()
    expect(screen.getByLabelText('Data de entrega')).toHaveTextContent('Selecione uma data')
    await user.click(screen.getByLabelText('Data de entrega'))
    expect(screen.getByRole('button', { name: 'Limpar data' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Hoje', exact: true }))
    expect(screen.getByLabelText('Valor da data')).toHaveTextContent(format(new Date(), 'yyyy-MM-dd'))
  })

  it('Escape fecha somente o calendário dentro do diálogo e preserva a seleção', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange} title="Editar prazo">
        <Field />
      </Dialog>,
    )
    await user.click(screen.getByLabelText('Data de entrega'))
    const calendar = screen.getByRole('dialog', { name: 'Selecionar data' })
    await user.click(within(calendar).getByRole('button', { name: 'Próximo mês' }))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(calendar).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Editar prazo' })).toBeVisible()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Valor da data')).toHaveTextContent('2026-10-08')
    expect(screen.getByLabelText('Data de entrega')).toHaveFocus()
  })

  it('impede abrir a seleção durante uma mutação', async () => {
    const user = userEvent.setup()
    render(<Field disabled />)
    await user.click(screen.getByLabelText('Data de entrega'))
    expect(screen.getByLabelText('Data de entrega')).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
