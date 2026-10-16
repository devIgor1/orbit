import type { AiTaskQuota } from '@/features/ai-tasks/schemas/ai-task-quota-schema'

export const aiQuota: AiTaskQuota = {
  blocked: [
    { scope: 'user', windowSeconds: 600, used: 15, limit: 15, retryAfterSeconds: 125 },
    { scope: 'workspace', windowSeconds: 86400, used: 750, limit: 750, retryAfterSeconds: 3661 },
  ],
  retryAfterSeconds: 3661,
}
