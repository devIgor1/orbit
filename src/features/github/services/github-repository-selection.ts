import { z } from 'zod'
import { invokeGithub } from './github-api'

const repositorySchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  fullName: z.string().min(1),
  isPrivate: z.boolean(),
  connected: z.boolean(),
  inUse: z.boolean(),
})
const selectionSchema = z.object({
  status: z.literal('repositories'),
  state: z.string().min(32).max(128),
  accountLogin: z.string().min(1),
  skippedCount: z.number().int().nonnegative(),
  repositories: z.array(repositorySchema).min(1).max(1000),
})
export type GithubRepositoryChoice = z.infer<typeof selectionSchema>
export const prepareGithubRepositories = (state: string, code: string) =>
  invokeGithub({ action: 'prepare-repositories', state, code }, selectionSchema)
export const selectGithubRepositories = (state: string, repositoryIds: number[]) =>
  invokeGithub(
    { action: 'select-repositories', state, repositoryIds },
    z.object({ url: z.url().startsWith('https://github.com/login/oauth/authorize?') }),
  )
export const completeGithubRepositories = (state: string, code: string) =>
  invokeGithub(
    { action: 'repositories-callback', state, code },
    z.object({
      workspaceId: z.uuid(),
      repositoryCount: z.number().int().positive(),
      accountLogin: z.string().min(1),
      skippedCount: z.number().int().nonnegative(),
    }),
  )
