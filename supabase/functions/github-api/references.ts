import { z } from 'zod'
import { githubRequest, installationToken, repositoryPath } from '../_shared/github/client.ts'
import { pullSchema, repositorySchema, type requestSchema } from '../_shared/github/contracts.ts'
import type { GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'
import { taskRepository } from './task-repository.ts'

type ReferencesRequest = Extract<z.infer<typeof requestSchema>, { action: 'references' }>
const pageSize = 50
const listedPull = pullSchema.extend({
  head: z.object({ ref: z.string(), repo: repositorySchema.pick({ id: true, full_name: true }).nullable() }),
  base: z.object({ ref: z.string(), repo: repositorySchema.pick({ id: true }) }),
})

export async function listTaskReferences(db: GithubDatabase, userId: string, input: ReferencesRequest) {
  const repository = await taskRepository(db, userId, input)
  const token = await installationToken(repository.installation_id, repository.github_id, 'read')
  const path = repositoryPath(repository.full_name)
  // Check current identity/default branch: installations may have moved or changed
  // their default branch since the last webhook was processed.
  const current = await githubRequest(token, path, repositorySchema)
  if (current.id !== repository.github_id) throw new GithubError('GITHUB_CONTRACT')
  if (input.kind === 'branch') {
    const branches = await githubRequest(
      token,
      `${path}/branches?per_page=${pageSize}&page=${input.page}`,
      z.array(z.object({ name: z.string().min(1).max(255) })),
    )
    return {
      kind: 'branch',
      items: branches.filter((branch) => branch.name !== current.default_branch),
      nextPage: branches.length === pageSize ? input.page + 1 : null,
    }
  }
  const pulls = await githubRequest(
    token,
    `${path}/pulls?state=${input.state}&sort=updated&direction=desc&per_page=${pageSize}&page=${input.page}`,
    z.array(listedPull),
  )
  if (pulls.some((pull) => pull.base.repo.id !== current.id)) throw new GithubError('GITHUB_CONTRACT')
  return {
    kind: 'pr',
    items: pulls.map((pull) => ({
      number: pull.number,
      title: pull.title,
      branch: pull.head.ref,
      baseBranch: pull.base.ref,
      headRepository: pull.head.repo?.full_name ?? null,
      state: pull.merged_at ? 'merged' : pull.state === 'closed' ? 'closed' : pull.draft ? 'draft' : 'open',
    })),
    nextPage: pulls.length === pageSize ? input.page + 1 : null,
  }
}
