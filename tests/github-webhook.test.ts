// @vitest-environment node
import { createHmac } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { createWebhookHandler } from '../supabase/functions/github-webhook/handler'

const secret = 'test-only-webhook-secret'
const delivery = 'aa000000-0000-4000-8000-000000000001'
function request(body: string, signature?: string, event = 'pull_request') {
  return new Request('https://example.test/webhook',{ method: 'POST',body,headers: {
    'x-hub-signature-256': signature ?? `sha256=${createHmac('sha256',secret).update(body).digest('hex')}`,
    'x-github-delivery': delivery,'x-github-event': event,
  } })
}
describe('GitHub webhook boundary',() => {
  it('rejects forged signatures without writing to the database',async () => {
    const receive = vi.fn()
    const response = await createWebhookHandler(() => secret,receive)(request('{}','sha256=' + '0'.repeat(64)))
    expect(response.status).toBe(401); expect(receive).not.toHaveBeenCalled()
  })
  it('persists only routing metadata from a signed event',async () => {
    const receive = vi.fn().mockResolvedValue(true)
    const payload = { installation: { id: 12 },repository: { id: 20,private: true },sender: { email: 'private@example.test' },
      pull_request: { number: 2,body: 'private details',head: { ref: 'feat/login',repo: { id: 20 } } } }
    const response = await createWebhookHandler(() => secret,receive)(request(JSON.stringify(payload)))
    expect(response.status).toBe(200)
    expect(receive).toHaveBeenCalledWith(delivery,'pull_request',{
      installation: { id: 12 },repository: { id: 20 },pull_request: { number: 2,head: { ref: 'feat/login',repo: { id: 20 } } },
    })
  })
  it('acknowledges a duplicate without pretending a new event was processed',async () => {
    const response = await createWebhookHandler(() => secret,vi.fn().mockResolvedValue(false))(request('{"installation":{"id":12}}'))
    expect(await response.json()).toEqual({ accepted: true,duplicate: true })
  })
  it('returns a failure when durable ingestion fails',async () => {
    const response = await createWebhookHandler(() => secret,vi.fn().mockRejectedValue(new Error('offline')))(request('{"installation":{"id":12}}'))
    expect(response.status).toBe(503)
  })
  it('rejects malformed signed input and handles ping without a database write',async () => {
    const receive = vi.fn()
    const handler = createWebhookHandler(() => secret,receive)
    expect((await handler(request('{bad'))).status).toBe(400)
    expect((await handler(request('{}',undefined,'ping'))).status).toBe(200)
    expect(receive).not.toHaveBeenCalled()
  })
})
