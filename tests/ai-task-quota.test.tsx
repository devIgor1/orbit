import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiTaskQuotaNotice } from '@/features/ai-tasks/components/ai-task-quota-notice'
import { AiTaskQuotaError } from '@/features/ai-tasks/services/ai-task-quota-error'
import { aiTaskQuotaSchema } from '@/features/ai-tasks/schemas/ai-task-quota-schema'
import { aiQuota } from './fixtures/ai-task-quota'

afterEach(() => vi.useRealTimers())
describe('AI quota feedback', () => {
  it('shows both scopes and windows and counts down to the longest wait', () => {
    vi.useFakeTimers()
    render(<AiTaskQuotaNotice error={new AiTaskQuotaError(aiQuota)} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Seu usuário: 15 de 15 tentativas nos últimos 10 minutos')
    expect(screen.getByRole('alert')).toHaveTextContent('Sua empresa: 750 de 750 tentativas nas últimas 24 horas')
    expect(screen.getByRole('timer')).toHaveTextContent('1 h 1 min 1 s')
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer')).toHaveTextContent('1 h 1 min.')
    act(() => vi.advanceTimersByTime(3_660_000))
    expect(screen.getByRole('timer')).toHaveTextContent('Prazo estimado encerrado')
    expect(screen.getByRole('timer')).toHaveAttribute('aria-live', 'off')
  })
  it('does not restart the wait when the dialog is reopened or a background tab resumes', () => {
    vi.useFakeTimers()
    const error = new AiTaskQuotaError(aiQuota)
    vi.advanceTimersByTime(3_660_000)
    const view = render(<AiTaskQuotaNotice error={error} />)
    expect(screen.getByRole('timer')).toHaveTextContent('em 1 s')
    vi.setSystemTime(Date.now() + 30_000)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('timer')).toHaveTextContent('Prazo estimado encerrado')
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each([
    { ...aiQuota, retryAfterSeconds: 125 },
    { ...aiQuota, blocked: [] },
    { ...aiQuota, blocked: [aiQuota.blocked[0], aiQuota.blocked[0]] },
    { ...aiQuota, secret: 'private data' },
    ...[{ used: 14 }, { used: '15' }, { scope: 'other' }, { windowSeconds: 60 }, { retryAfterSeconds: 601 }]
      .map(change => ({ ...aiQuota, blocked: [{ ...aiQuota.blocked[0], ...change }] })),
  ])('rejects misleading or unsafe quota payloads %#', payload => {
    expect(aiTaskQuotaSchema.safeParse(payload).success).toBe(false)
  })
})
