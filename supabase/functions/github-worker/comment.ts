import { z } from 'zod'
import { githubRequest, repositoryPath } from '../_shared/github/client.ts'
import { GithubError } from '../_shared/github/errors.ts'

const commentSchema = z.object({
  id: z.number().int().positive(),
  body: z.string(),
  user: z.object({ login: z.string(), type: z.string() }),
})
export function completionComment(
  workspaceId: string,
  taskId: string,
  projectId: string,
  title: string,
  origin: string,
) {
  const marker = `<!-- orbit:merge:${workspaceId}:${taskId} -->`
  const escaped = title
    .replace(/[\\`*_{}[\]()<>#!|]/g, '\\$&')
    .replaceAll('@', '@\u200b')
    .replace(/[\r\n]+/g, ' ')
  return {
    marker,
    body: `${marker}\n✅ **Tarefa concluída no Orbit**\n\n${escaped}\n\nO merge deste PR foi confirmado e a tarefa foi marcada como concluída.\n\n[Abrir tarefa no Orbit](${origin}/projects/${projectId}?task=${taskId})`,
  }
}
export async function ensureCompletionComment(
  token: string,
  fullName: string,
  pr: number,
  slug: string,
  message: { marker: string; body: string },
  request = githubRequest,
) {
  const path = `${repositoryPath(fullName)}/issues/${pr}/comments`
  // Reconcile before POST: GitHub has no idempotency key for this endpoint.
  for (let page = 1; page <= 10; page++) {
    const comments = await request(token, `${path}?per_page=100&page=${page}`, z.array(commentSchema))
    const existing = comments.find(
      (comment) =>
        comment.user.type === 'Bot' && comment.user.login === `${slug}[bot]` && comment.body.includes(message.marker),
    )
    if (existing) return existing.id
    if (comments.length < 100) {
      const created = await request(token, path, commentSchema, { body: message.body })
      return created.id
    }
  }
  throw new GithubError('GITHUB_TOO_MANY_RESULTS')
}
