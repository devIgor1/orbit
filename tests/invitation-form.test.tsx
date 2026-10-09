import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { InvitationForm } from '@/features/companies/components/invitation-form'

it('preserva o email em falhas e bloqueia envios duplicados durante a operação', async () => {
  const user = userEvent.setup()
  let rejectSend: (error: Error) => void = () => {}
  const onInvite = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectSend = reject }))
  render(<InvitationForm busy={false} onInvite={onInvite} />)
  await user.type(screen.getByLabelText('E-mail do colaborador'), 'PERSON@example.test')
  await user.click(screen.getByRole('button', { name: 'Enviar convite' }))
  expect(screen.getByRole('button', { name: 'Aguarde…' })).toBeDisabled()
  expect(onInvite).toHaveBeenCalledWith('person@example.test', true)
  rejectSend(new Error('recusado'))
  expect(await screen.findByRole('button', { name: 'Enviar convite' })).toBeEnabled()
  expect(screen.getByLabelText('E-mail do colaborador')).toHaveValue('PERSON@example.test')
})
it('permite gerar somente o link e limpa o email apenas após sucesso', async () => {
  const user = userEvent.setup()
  const onInvite = vi.fn().mockResolvedValue(undefined)
  render(<InvitationForm busy={false} onInvite={onInvite} />)
  await user.type(screen.getByLabelText('E-mail do colaborador'), 'person@example.test')
  await user.click(screen.getByRole('button', { name: 'Gerar só o link' }))
  expect(onInvite).toHaveBeenCalledWith('person@example.test', false)
  expect(screen.getByLabelText('E-mail do colaborador')).toHaveValue('')
})
