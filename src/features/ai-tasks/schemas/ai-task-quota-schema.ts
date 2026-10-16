import { z } from 'zod'

const blockedLimitSchema = z.strictObject({
  scope: z.enum(['user', 'workspace']),
  windowSeconds: z.union([z.literal(600), z.literal(86400)]),
  used: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  limit: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  retryAfterSeconds: z.number().int().positive().max(86400),
}).refine(value => value.used >= value.limit && value.retryAfterSeconds <= value.windowSeconds)

export const aiTaskQuotaSchema = z.strictObject({
  blocked: z.array(blockedLimitSchema).min(1).max(4),
  retryAfterSeconds: z.number().int().positive().max(86400),
}).refine(value => new Set(value.blocked.map(item => `${item.scope}:${item.windowSeconds}`)).size === value.blocked.length
  && value.retryAfterSeconds === Math.max(...value.blocked.map(item => item.retryAfterSeconds)))

export type AiTaskQuota = z.infer<typeof aiTaskQuotaSchema>
