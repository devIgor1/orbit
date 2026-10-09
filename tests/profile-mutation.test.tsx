import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProfileForm } from '@/features/team/components/profile-form'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { updateProfile } from '@/features/team/services/team-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testProfile, testWorkspace } from './test-providers'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
vi.mock('@/features/team/services/team-service', () => ({ updateProfile: vi.fn() }))

beforeEach(() => {
  vi.mocked(fetchWorkspace).mockReset().mockResolvedValue(testWorkspace)
  vi.mocked(updateProfile).mockReset()
})

describe('Edição do próprio perfil', () => {
  it('preserva o formulário e não confirma sucesso em uma escrita recusada', async () => {
    vi.mocked(updateProfile).mockRejectedValue(new AppError('permission', 'Você não tem permissão para realizar esta ação.'))
    const onSaved = vi.fn()
    const user = userEvent.setup()
    const client = createTestClient()
    client.setQueryData(['workspace', 'user-1'], testWorkspace)
    render(<TestProviders client={client}><ProfileForm profile={testProfile} onSaved={onSaved} /></TestProviders>)
    await user.clear(screen.getByLabelText('Nome completo'))
    await user.type(screen.getByLabelText('Nome completo'), 'Nome editado')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/permissão/)
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Nome editado')
    expect(onSaved).not.toHaveBeenCalled()
    expect(client.getQueryData(['workspace', 'user-1'])).toEqual(testWorkspace)
  })

  it('invalida workspace e equipe somente após confirmação do servidor', async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ...testProfile, full_name: 'Nome editado' })
    const onSaved = vi.fn()
    const user = userEvent.setup()
    const client = createTestClient()
    client.setQueryData(['workspace', 'user-1'], testWorkspace)
    client.setQueryData(['team', 'user-1', 'workspace-1', ''], [])
    const invalidation = vi.spyOn(client, 'invalidateQueries')
    render(<TestProviders client={client}><ProfileForm profile={testProfile} onSaved={onSaved} /></TestProviders>)
    await user.clear(screen.getByLabelText('Nome completo'))
    await user.type(screen.getByLabelText('Nome completo'), 'Nome editado')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ['workspace', 'user-1'] })
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ['team', 'user-1', 'workspace-1'] })
  })
})
