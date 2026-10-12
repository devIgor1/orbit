import { z } from 'zod'
import { appOrigin, required } from '../_shared/github/config.ts'
import { githubRequest, installationToken } from '../_shared/github/client.ts'
import { repositorySchema } from '../_shared/github/contracts.ts'
import { confirmed, type GithubDatabase } from '../_shared/github/database.ts'
import { githubFailure, GithubError } from '../_shared/github/errors.ts'
import { completionComment, ensureCompletionComment } from './comment.ts'
import { readSnapshot } from './snapshot.ts'

const jobSchema = z.object({
  lease: z.uuid(),
  generation: z.number().int(),
  link: z.object({
    id: z.uuid(),
    task_id: z.uuid(),
    workspace_id: z.uuid(),
    project_id: z.uuid(),
    repository_id: z.uuid(),
    branch: z.string(),
    head_repository_id: z.number(),
    pr_number: z.number().nullable(),
    created_at: z.string(),
  }),
  repository: z.object({ id: z.uuid(), github_id: z.number(), installation_id: z.number() }),
})
async function processJob(db: GithubDatabase, job: z.infer<typeof jobSchema>) {
  const finish = { target_link: job.link.id, job_lease: job.lease, job_generation: job.generation }
  try {
    const token = await installationToken(job.repository.installation_id, job.repository.github_id)
    const repo = await githubRequest(token, `/repositories/${job.repository.github_id}`, repositorySchema)
    if (repo.id !== job.repository.github_id) throw new GithubError('GITHUB_CONTRACT')
    confirmed(
      await db
        .from('github_repositories')
        .update({ full_name: repo.full_name, default_branch: repo.default_branch, is_private: repo.private })
        .eq('id', job.repository.id)
        .eq('active', true)
        .select('id')
        .single(),
    )
    const snapshot = await readSnapshot(token, repo.full_name, repo.id, job.link)
    const result = z.object({ task_title: z.string(), comment_id: z.number().nullable() }).parse(
      confirmed(
        await db.rpc('apply_github_snapshot', {
          target_link: job.link.id,
          job_lease: job.lease,
          snapshot,
        }),
      ),
    )
    let commentId = result.comment_id
    if (snapshot.pr_state === 'merged' && snapshot.pr_number && !commentId) {
      // Recheck that the connection remains enabled immediately before the external write.
      confirmed(
        await db.from('github_repositories').select('id').eq('id', job.repository.id).eq('active', true).single(),
      )
      commentId = await ensureCompletionComment(
        token,
        repo.full_name,
        snapshot.pr_number,
        required('GITHUB_APP_SLUG'),
        completionComment(job.link.workspace_id, job.link.task_id, job.link.project_id, result.task_title, appOrigin()),
      )
    }
    confirmed(await db.rpc('finish_github_job', { ...finish, ...(commentId ? { sent_comment_id: commentId } : {}) }))
    return { id: job.link.id, ok: true }
  } catch (error) {
    const failure = githubFailure(error)
    console.error('github-worker', { link: job.link.id, code: failure.code })
    confirmed(await db.rpc('finish_github_job', { ...finish, failure_code: failure.code }))
    return { id: job.link.id, ok: false }
  }
}
export async function processGithubJobs(db: GithubDatabase) {
  const jobs = z.array(jobSchema).parse(confirmed(await db.rpc('claim_github_jobs')))
  return Promise.all(jobs.map((job) => processJob(db, job)))
}
