import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AiTaskDialog } from '@/features/ai-tasks/components/ai-task-dialog'
import * as service from '@/features/ai-tasks/services/ai-task-service'
import { AppError } from '@/lib/errors/app-error'
import { createTestClient, TestProviders } from './test-providers'
import { aiCreated, aiRequest, aiUserId } from './fixtures/ai-task'

vi.mock('@/features/ai-tasks/services/ai-task-service', () => ({ createAiTask: vi.fn() }))
vi.mock('@/features/workspace/use-query-scope', () => ({ useQueryScope: () => ({
  userId: aiUserId, workspaceId: aiRequest.workspaceId, enabled: true,
  requireScope: () => ({ userId: aiUserId, workspaceId: aiRequest.workspaceId }),
}) }))
const createTask = vi.mocked(service.createAiTask)
beforeEach(() => vi.resetAllMocks())
function setup() {
  const client = createTestClient()
  const onOpenChange = vi.fn()
  const onOpenTask = vi.fn()
  const invalidation = vi.spyOn(client, 'invalidateQueries')
  render(<TestProviders client={client}><AiTaskDialog open projectId={aiRequest.projectId} projectTitle="Loja"
    onOpenChange={onOpenChange} onOpenTask={onOpenTask} /></TestProviders>)
  return { user: userEvent.setup(), onOpenChange, onOpenTask, invalidation }
}
describe('AI task composer', () => {
  it('preserves text and request ID on failure; invalidates only after confirmed creation', async () => {
    createTask.mockRejectedValueOnce(new AppError('network', 'Sem conexão')).mockResolvedValueOnce(aiCreated)
    const { user, invalidation, onOpenTask } = setup()
    await user.type(screen.getByLabelText('O que precisa ser feito?'), aiRequest.prompt)
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão')
    expect(screen.getByLabelText('O que precisa ser feito?')).toHaveValue(aiRequest.prompt)
    expect(invalidation).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    expect(await screen.findByText('Tarefa criada')).toBeVisible()
    expect(createTask.mock.calls[0][0].requestId).toBe(createTask.mock.calls[1][0].requestId)
    expect(invalidation).toHaveBeenCalledWith({ queryKey: ['tasks', aiUserId, aiRequest.workspaceId] })
    await user.click(screen.getByRole('button', { name: 'Abrir tarefa' }))
    expect(onOpenTask).toHaveBeenCalledWith(aiCreated.task.id)
  })
  it('keeps clarification separate from success and changes the key when the request changes', async () => {
    createTask.mockResolvedValueOnce({ kind: 'clarification', message: 'Qual validação?' }).mockResolvedValueOnce(aiCreated)
    const { user, invalidation } = setup()
    await user.type(screen.getByLabelText('O que precisa ser feito?'), aiRequest.prompt)
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    expect(await screen.findByText('Qual validação?')).toBeVisible()
    expect(screen.queryByText('Tarefa criada')).not.toBeInTheDocument()
    expect(invalidation).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('O que precisa ser feito?'), ' Validar CPF.')
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    await screen.findByText('Tarefa criada')
    expect(createTask.mock.calls[0][0].requestId).not.toBe(createTask.mock.calls[1][0].requestId)
  })
  it('prevents duplicate submissions and closing during a pending write', async () => {
    let resolve: (value: typeof aiCreated) => void = () => {}
    createTask.mockImplementation(() => new Promise(done => { resolve = done }))
    const { user, onOpenChange } = setup()
    await user.type(screen.getByLabelText('O que precisa ser feito?'), aiRequest.prompt)
    await user.dblClick(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    expect(createTask).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Criando tarefa…' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
    resolve(aiCreated)
    await screen.findByText('Tarefa criada')
  })
  it('shows a fixed refusal, preserves input, and refreshes no business data', async () => {
    createTask.mockResolvedValue({ kind: 'rejected', reason: 'out_of_scope' })
    const { user, invalidation } = setup()
    const prompt = 'Qual é a capital da França?'
    await user.type(screen.getByLabelText('O que precisa ser feito?'), prompt)
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    expect(await screen.findByText(/A IA do Orbit serve para cadastrar tarefas/)).toBeVisible()
    expect(screen.queryByText('Tarefa criada')).not.toBeInTheDocument()
    expect(screen.getByLabelText('O que precisa ser feito?')).toHaveValue(prompt)
    expect(invalidation).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(2))
    expect(createTask.mock.calls[0][0].requestId).toBe(createTask.mock.calls[1][0].requestId)
    await user.type(screen.getByLabelText('O que precisa ser feito?'), ' Alterado.')
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    await waitFor(() => expect(createTask).toHaveBeenCalledTimes(3))
    expect(createTask.mock.calls[2][0].requestId).not.toBe(createTask.mock.calls[1][0].requestId)
  })
  it('validates an empty prompt and supports explicitly creating another task', async () => {
    createTask.mockResolvedValue(aiCreated)
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    await screen.findByText('Descreva a tarefa usando entre 10 e 3.000 caracteres.')
    expect(createTask).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText('O que precisa ser feito?'), aiRequest.prompt)
    await user.click(screen.getByRole('button', { name: 'Criar tarefa com IA' }))
    await user.click(await screen.findByRole('button', { name: 'Criar outra' }))
    await waitFor(() => expect(screen.getByLabelText('O que precisa ser feito?')).toHaveValue(''))
  })
})
