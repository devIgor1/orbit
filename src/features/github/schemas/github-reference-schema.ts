import { z } from 'zod'

const nextPage = z.number().int().positive().nullable()
export const githubReferencePageSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('branch'), items: z.array(z.object({ name: z.string().min(1).max(255) })), nextPage }),
  z.object({
    kind: z.literal('pr'),
    items: z.array(
      z.object({
        number: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
        title: z.string(),
        branch: z.string(),
        baseBranch: z.string(),
        headRepository: z.string().nullable(),
        state: z.enum(['open', 'draft', 'closed', 'merged']),
      }),
    ),
    nextPage,
  }),
])
export type GithubReferencePage = z.infer<typeof githubReferencePageSchema>
export type GithubReferenceKind = GithubReferencePage['kind']
export type GithubPullFilter = 'open' | 'closed' | 'all'
