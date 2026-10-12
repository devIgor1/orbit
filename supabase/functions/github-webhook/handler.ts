import { z } from 'zod'
import { verifySignature } from '../_shared/github/crypto.ts'
import { GithubError, githubFailure } from '../_shared/github/errors.ts'

const eventSchema = z.object({
  action: z.string().optional(),
  ref: z.string().optional(),
  installation: z.object({ id: z.number().int().positive() }).optional(),
  repository: z.object({ id: z.number().int().positive() }).optional(),
  repositories_removed: z.array(z.object({ id: z.number().int().positive() })).optional(),
  pull_request: z
    .object({
      number: z.number().int().positive(),
      head: z.object({ ref: z.string(), repo: z.object({ id: z.number().int().positive() }).nullable() }),
    })
    .optional(),
})
type Event = z.infer<typeof eventSchema>
export function createWebhookHandler(
  secret: () => string,
  receive: (delivery: string, event: string, body: Event) => Promise<boolean>,
) {
  return async (request: Request) => {
    if (request.method !== 'POST') return new Response(null, { status: 405 })
    try {
      const body = await request.text()
      if (body.length > 2_000_000) throw new GithubError('INVALID_REQUEST', 413)
      if (!(await verifySignature(body, request.headers.get('x-hub-signature-256'), secret())))
        throw new GithubError('INVALID_SIGNATURE', 401)
      const delivery = z.uuid().safeParse(request.headers.get('x-github-delivery'))
      const event = request.headers.get('x-github-event')
      if (!delivery.success || !event) throw new GithubError('INVALID_REQUEST', 400)
      if (!['pull_request', 'push', 'installation', 'installation_repositories', 'repository'].includes(event))
        return Response.json({ accepted: true, ignored: true })
      let json: unknown
      try {
        json = JSON.parse(body)
      } catch {
        throw new GithubError('INVALID_REQUEST', 400)
      }
      const parsed = eventSchema.safeParse(json)
      if (!parsed.success || !parsed.data.installation) throw new GithubError('INVALID_REQUEST', 400)
      const inserted = await receive(delivery.data, event, parsed.data)
      return Response.json({ accepted: true, duplicate: !inserted })
    } catch (error) {
      const failure = githubFailure(error)
      console.error('github-webhook', { code: failure.code })
      return Response.json({ code: failure.code }, { status: failure.status })
    }
  }
}
