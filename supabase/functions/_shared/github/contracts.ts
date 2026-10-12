import { z } from 'zod'

export const githubId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
export const repositoryName = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
  .max(201)
export const repositorySchema = z.object({
  id: githubId,
  full_name: repositoryName,
  default_branch: z.string(),
  private: z.boolean(),
})
export const pullSchema = z.object({
  number: githubId,
  title: z.string(),
  state: z.enum(['open', 'closed']),
  draft: z.boolean(),
  merged_at: z.string().nullable(),
  closed_at: z.string().nullable(),
  head: z.object({ ref: z.string(), repo: z.object({ id: githubId }).nullable() }),
  base: z.object({ repo: z.object({ id: githubId }) }),
})
export const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('config') }),
  z.object({
    action: z.literal('references'),
    workspaceId: z.uuid(),
    taskId: z.uuid(),
    repositoryId: z.uuid(),
    kind: z.enum(['branch', 'pr']),
    page: z.number().int().positive().max(10000).default(1),
    state: z.enum(['open', 'closed', 'all']).default('open'),
  }),
  z.object({ action: z.literal('connect-account'), workspaceId: z.uuid() }),
  z.object({ action: z.literal('discover-account'), workspaceId: z.uuid() }),
  z.object({
    action: z.literal('discovery-callback'),
    state: z.string().min(32).max(128),
    code: z.string().min(1).max(256),
  }),
  z.object({
    action: z.literal('select-installation'),
    state: z.string().min(32).max(128),
    installationId: githubId.nullable(),
  }),
  z.object({
    action: z.literal('installation-callback'),
    state: z.string().min(32).max(128),
    installationId: githubId,
  }),
  z.object({
    action: z.literal('account-callback'),
    state: z.string().min(32).max(128),
    code: z.string().min(1).max(256),
  }),
  z.object({ action: z.literal('connect'), workspaceId: z.uuid(), repository: repositoryName }),
  z.object({ action: z.literal('callback'), state: z.string().min(32).max(128), code: z.string().min(1).max(256) }),
  z
    .object({
      action: z.literal('link'),
      workspaceId: z.uuid(),
      taskId: z.uuid(),
      repositoryId: z.uuid(),
      branch: z.string().trim().min(1).max(255).optional(),
      prNumber: githubId.optional(),
    })
    .refine((input) => Boolean(input.branch) !== Boolean(input.prNumber)),
])
export const snapshotSchema = z.object({
  branch: z.string(),
  head_repository_id: githubId,
  pr_number: githubId.nullable(),
  pr_title: z.string().nullable(),
  pr_state: z.enum(['branch', 'draft', 'open', 'closed', 'merged']),
  merged_at: z.string().nullable(),
})
export type GithubSnapshot = z.infer<typeof snapshotSchema>
export function pullSnapshot(pull: z.infer<typeof pullSchema>, expectedRepository: number): GithubSnapshot {
  if (pull.base.repo.id !== expectedRepository || !pull.head.repo) throw new Error('Invalid PR repository')
  return {
    branch: pull.head.ref,
    head_repository_id: pull.head.repo.id,
    pr_number: pull.number,
    pr_title: pull.title,
    pr_state: pull.merged_at ? 'merged' : pull.state === 'closed' ? 'closed' : pull.draft ? 'draft' : 'open',
    merged_at: pull.merged_at,
  }
}
