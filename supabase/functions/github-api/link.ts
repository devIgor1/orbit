import { z } from 'zod'
import { githubRequest, installationToken, repositoryPath } from '../_shared/github/client.ts'
import { pullSchema, pullSnapshot, repositorySchema, type requestSchema } from '../_shared/github/contracts.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { GithubError } from '../_shared/github/errors.ts'
import { taskRepository } from './task-repository.ts'

type LinkRequest = Extract<z.infer<typeof requestSchema>, { action: 'link' }>
export async function linkTask(db: GithubDatabase, userId: string, input: LinkRequest) {
  const repository = await taskRepository(db, userId, input)
  const token = await installationToken(repository.installation_id, repository.github_id, 'read')
  const path = repositoryPath(repository.full_name)
  const current = await githubRequest(token, path, repositorySchema)
  if (current.id !== repository.github_id) throw new GithubError('GITHUB_CONTRACT')
  let development: { branch: string; head_repository_id: number; pr_number: number | null }
  if (input.prNumber) {
    const pull = await githubRequest(token, `${path}/pulls/${input.prNumber}`, pullSchema)
    if (pull.number !== input.prNumber) throw new GithubError('GITHUB_CONTRACT')
    development = pullSnapshot(pull, repository.github_id)
  } else {
    if (!input.branch || input.branch === current.default_branch)
      throw new GithubError('GITHUB_BRANCH_REQUIRED', 400)
    const branch = await githubRequest(
      token,
      `${path}/branches/${encodeURIComponent(input.branch)}`,
      z.object({ name: z.string() }),
    )
    if (branch.name !== input.branch) throw new GithubError('GITHUB_CONTRACT')
    development = { branch: branch.name, head_repository_id: repository.github_id, pr_number: null }
  }
  const id = confirmed(
    await db.rpc('link_task_github', {
      requester: userId,
      target_workspace: input.workspaceId,
      target_task: input.taskId,
      target_repository: repository.id,
      development,
    }),
  )
  return { id }
}
