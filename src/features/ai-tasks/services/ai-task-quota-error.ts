import { AppError } from '@/lib/errors/app-error'
import type { AiTaskQuota } from '../schemas/ai-task-quota-schema'

export class AiTaskQuotaError extends AppError {
  readonly retryAt: number
  constructor(readonly quota: AiTaskQuota) {
    super('contract', 'O limite de tentativas com IA foi atingido.')
    this.retryAt = Date.now() + quota.retryAfterSeconds * 1000
  }
}
