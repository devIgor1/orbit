import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { GithubLinkForm } from '@/features/github/components/github-link-form'
import { AppError } from '@/lib/errors/app-error'
it('preserves branch input after failure and disables duplicate submissions',async () => {
  const user = userEvent.setup()
  const submit = vi.fn().mockResolvedValue(undefined)
  const { rerender } = render(<GithubLinkForm isPending={false} error={null} onSubmit={submit} />)
  await user.type(screen.getByLabelText('Branch de trabalho'),'feat/login')
  await user.click(screen.getByRole('button',{ name: 'Vincular à tarefa' }))
  await waitFor(() => expect(submit).toHaveBeenCalledWith({ kind: 'branch',reference: 'feat/login' },expect.anything()))
  rerender(<GithubLinkForm isPending={false} error={new AppError('permission','Acesso recusado.')} onSubmit={submit} />)
  expect(screen.getByLabelText('Branch de trabalho')).toHaveValue('feat/login')
  expect(screen.getByRole('alert')).toHaveTextContent('Acesso recusado.')
  rerender(<GithubLinkForm isPending error={null} onSubmit={submit} />)
  expect(screen.getByLabelText('Branch de trabalho')).toBeDisabled()
  expect(screen.getByRole('button',{ name: 'Validando no GitHub…' })).toBeDisabled()
})
