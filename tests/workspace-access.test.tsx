import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { fetchWorkspace } from '@/features/workspace/workspace-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders, testWorkspace } from './test-providers'

vi.mock('@/features/workspace/workspace-service', () => ({ fetchWorkspace: vi.fn() }))
function Probe() {
  const workspace = useWorkspace()
  return <><p>{workspace.isError ? workspace.error.message : workspace.data?.role}</p><button onClick={() => void workspace.refetch()}>Atualizar</button></>
}
beforeEach(() => { vi.mocked(fetchWorkspace).mockReset().mockResolvedValue(testWorkspace) })
describe('Mudanças de acesso em sessões existentes', () => {
  it.each(['role', 'removed', 'company'] as const)('descarta dados privados antigos após %s', async change => {
    const client = createTestClient()
    const view = render(<TestProviders client={client}><Probe /></TestProviders>)
    await screen.findByText('admin')
    client.setQueryData(['member-events', 'user-1', 'workspace-1'], { private: true })
    client.setQueryData(['tasks', 'user-1', 'workspace-1'], ['private-task'])
    client.setQueryData(['companies', 'user-1'], [testWorkspace.workspace])
    if (change === 'removed') vi.mocked(fetchWorkspace).mockRejectedValue(new AppError('onboarding', 'Escolha uma empresa.'))
    else vi.mocked(fetchWorkspace).mockResolvedValue(change === 'role' ? { ...testWorkspace, role: 'member' }
      : { ...testWorkspace, role: 'member', workspace: { ...testWorkspace.workspace, id: 'workspace-2' } })
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }))
    await screen.findByText(change === 'removed' ? 'Escolha uma empresa.' : 'member')
    expect(client.getQueryData(['member-events', 'user-1', 'workspace-1'])).toBeUndefined()
    expect(client.getQueryData(['tasks', 'user-1', 'workspace-1'])).toBeUndefined()
    expect(client.getQueryData(['companies', 'user-1'])).toBeUndefined()
    view.unmount()
    client.clear()
  })
})
