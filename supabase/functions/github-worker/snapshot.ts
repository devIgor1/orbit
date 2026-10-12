import { z } from 'zod'
import { githubRequest, repositoryPath } from '../_shared/github/client.ts'
import { pullSchema, pullSnapshot, type GithubSnapshot } from '../_shared/github/contracts.ts'
import { GithubError } from '../_shared/github/errors.ts'

type Link = { branch: string; head_repository_id: number; pr_number: number | null; created_at: string }
export async function readSnapshot(
  token: string,
  fullName: string,
  repositoryId: number,
  link: Link,
): Promise<GithubSnapshot> {
  const path = repositoryPath(fullName)
  if (link.pr_number) {
    const pull = await githubRequest(token, `${path}/pulls/${link.pr_number}`, pullSchema)
    if (pull.number !== link.pr_number) throw new GithubError('GITHUB_CONTRACT')
    return pullSnapshot(pull, repositoryId)
  }
  const candidates: z.infer<typeof pullSchema>[] = []
  for (let page = 1; page <= 10; page++) {
    const query = new URLSearchParams({
      state: 'all',
      head: `${fullName.split('/')[0]}:${link.branch}`,
      sort: 'updated',
      direction: 'desc',
      per_page: '100',
      page: String(page),
    })
    const pulls = await githubRequest(token, `${path}/pulls?${query}`, z.array(pullSchema))
    candidates.push(
      ...pulls.filter(
        (pull) =>
          pull.head.ref === link.branch &&
          pull.head.repo?.id === link.head_repository_id &&
          pull.base.repo.id === repositoryId &&
          (pull.state === 'open' ||
            (pull.closed_at !== null && Date.parse(pull.closed_at) >= Date.parse(link.created_at))),
      ),
    )
    if (pulls.length < 100) break
    if (page === 10) throw new GithubError('GITHUB_TOO_MANY_RESULTS')
  }
  const open = candidates.filter((pull) => pull.state === 'open')
  const choices = open.length ? open : candidates
  if (choices.length > 1) throw new GithubError('GITHUB_AMBIGUOUS_BRANCH')
  if (choices.length === 1) return pullSnapshot(choices[0], repositoryId)
  // Listing PRs before the branch also handles branches deleted immediately after merge.
  const branch = await githubRequest(
    token,
    `${path}/branches/${encodeURIComponent(link.branch)}`,
    z.object({ name: z.string() }),
  )
  if (branch.name !== link.branch) throw new GithubError('GITHUB_CONTRACT')
  return {
    branch: link.branch,
    head_repository_id: link.head_repository_id,
    pr_number: null,
    pr_title: null,
    pr_state: 'branch',
    merged_at: null,
  }
}
