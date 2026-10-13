import { createServer, request as proxyRequest } from 'node:http'
import { createHmac, randomUUID } from 'node:crypto'
import { localBackend } from './local-backend.ts'
import { createGithubSandbox, sandboxUpdate } from './github-sandbox.ts'
import { handleGithubApi } from '../../supabase/functions/github-api/handler.ts'
import { createWebhookHandler } from '../../supabase/functions/github-webhook/handler.ts'
import { processGithubJobs } from '../../supabase/functions/github-worker/process.ts'
import { adminClient, confirmed } from '../../supabase/functions/_shared/github/database.ts'

const config = await localBackend()
const sandbox = createGithubSandbox()
const secrets: Record<string, string> = {
  ...sandbox.secrets,
  SUPABASE_URL: config.API_URL,
  SUPABASE_SERVICE_ROLE_KEY: config.SERVICE_ROLE_KEY,
  ORBIT_APP_URL: 'http://127.0.0.1:5178',
}
Object.assign(globalThis, { Deno: { env: { get: (key: string) => secrets[key] } } })
const realFetch = globalThis.fetch
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input)
  if (['github.com', 'api.github.com'].includes(url.hostname)) return sandbox.fetch(input, init)
  if (url.origin !== config.API_URL) throw new Error('Test server blocked an unexpected network destination')
  return realFetch(input, init)
}
const db = adminClient()
const webhook = createWebhookHandler(
  () => secrets.GITHUB_WEBHOOK_SECRET,
  async (delivery, eventName, event) =>
    confirmed(await db.rpc('receive_github_event', { delivery, event_name: eventName, event })),
)

createServer(async (req, res) => {
  const path = req.url ?? '/'
  // This test-only server must never bind to a public interface or use a remote backend.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (path.startsWith('/rest/v1/') || path.startsWith('/auth/v1/')) {
    const target = proxyRequest(
      new URL(path, config.API_URL),
      { method: req.method, headers: req.headers },
      (upstream) => {
        res.writeHead(upstream.statusCode ?? 502, { ...upstream.headers, 'access-control-allow-origin': '*' })
        upstream.pipe(res)
      },
    )
    target.on('error', () => {
      res.writeHead(502)
      res.end()
    })
    req.pipe(target)
    return
  }
  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(Buffer.from(chunk))
    const body = Buffer.concat(chunks).toString()
    const request = new Request(`http://127.0.0.1:55530${path}`, {
      method: req.method,
      headers: Object.fromEntries(
        Object.entries(req.headers).flatMap(([key, value]) => (typeof value === 'string' ? [[key, value]] : [])),
      ),
      ...(body ? { body } : {}),
    })
    let response: Response
    if (path === '/functions/v1/github-api') response = await handleGithubApi(request)
    else if (path === '/functions/v1/github-webhook') response = await webhook(request)
    else if (path === '/__test/github')
      response = Response.json(
        req.method === 'GET' ? sandbox.snapshot() : sandbox.update(sandboxUpdate.parse(JSON.parse(body))),
      )
    else if (path === '/__test/worker') response = Response.json(await processGithubJobs(db))
    else if (path === '/__test/event') {
      const event = JSON.parse(body)
      const delivery = randomUUID()
      const payload = JSON.stringify(event.body)
      const signed = new Request('http://127.0.0.1/webhook', {
        method: 'POST',
        body: payload,
        headers: {
          'x-github-delivery': delivery,
          'x-github-event': event.name,
          'x-hub-signature-256': `sha256=${createHmac('sha256', secrets.GITHUB_WEBHOOK_SECRET).update(payload).digest('hex')}`,
        },
      })
      response = await webhook(signed)
    } else response = new Response(null, { status: 404 })
    res.writeHead(response.status, Object.fromEntries(response.headers))
    res.end(await response.text())
  } catch (error) {
    console.error('Local flow fixture failed', error instanceof Error ? error.message : 'Unknown failure')
    res.writeHead(500)
    res.end(JSON.stringify({ code: 'TEST_FIXTURE_FAILED' }))
  }
}).listen(55530, '127.0.0.1', () => console.log('GitHub flow test server ready on 127.0.0.1:55530'))
