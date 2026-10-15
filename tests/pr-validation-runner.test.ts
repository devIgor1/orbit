import { describe, expect, it, vi } from 'vitest'
import { createPrChecksReader } from '../scripts/pr-validation-github'
import { waitForPrValidations } from '../scripts/pr-validation-runner'

const sha = 'a'.repeat(40)
const jobs = { quality: { result: 'success' } }
const status = { id: 1, context: 'Vercel', state: 'success', creator: { login: 'vercel[bot]' } }
const check = { id: 1, name: 'Vercel Preview Comments', head_sha: sha, status: 'completed', conclusion: 'success', app: { id: 8329 } }

describe('PR validation transport and waiting', () => {
  it('waits for pending evidence then confirms success on the exact PR commit', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json([{ ...status, state: 'pending' }]))
      .mockResolvedValueOnce(Response.json({ check_runs: [check] }))
      .mockResolvedValueOnce(Response.json([status]))
      .mockResolvedValueOnce(Response.json({ check_runs: [check] }))
    const readChecks = createPrChecksReader('devIgor1/orbit', sha, 'test-only', request)
    const wait = vi.fn(async () => {})
    await waitForPrValidations({ jobs, sha, readChecks, wait, attempts: 2, report: vi.fn() })
    expect(wait).toHaveBeenCalledOnce()
    expect(request).toHaveBeenCalledTimes(4)
    expect(request.mock.calls.every(([url]) => String(url).includes(`/commits/${sha}/`))).toBe(true)
  })

  it('rejects failed dependencies without consulting or waiting for external services', async () => {
    const readChecks = vi.fn()
    await expect(waitForPrValidations({ jobs: { quality: { result: 'failure' } }, sha, readChecks })).rejects.toThrow('quality')
    expect(readChecks).not.toHaveBeenCalled()
  })

  it('fails after the deadline when a check never appears', async () => {
    const readChecks = vi.fn(async () => [])
    const wait = vi.fn(async () => {})
    await expect(waitForPrValidations({ jobs, sha, readChecks, wait, attempts: 2, report: vi.fn() })).rejects.toThrow('prazo')
    expect(wait).toHaveBeenCalledOnce()
  })

  it('fails immediately on a completed failure instead of waiting for a success', async () => {
    const readChecks = vi.fn(async (kind: string) => kind === 'statuses' ? [{ ...status, state: 'failure' }] : [check])
    const wait = vi.fn(async () => {})
    await expect(waitForPrValidations({ jobs, sha, readChecks, wait })).rejects.toThrow('não aprovado')
    expect(wait).not.toHaveBeenCalled()
  })

  it.each(['statuses', 'check-runs'] as const)('reads all pages of %s', async kind => {
    const page = (id: number) => kind === 'statuses' ? [{ ...status, id }] : { check_runs: [{ ...check, id }] }
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(page(1), { headers: { link: '<https://api.github.com/next>; rel="next"' } }))
      .mockResolvedValueOnce(Response.json(page(2)))
    const result = await createPrChecksReader('devIgor1/orbit', sha, 'test-only', request)(kind)
    expect(result).toHaveLength(2)
    expect(String(request.mock.calls[1][0])).toContain('page=2')
  })

  it.each([401, 403, 429, 500])('fails closed on HTTP %s without logging the response body or token', async statusCode => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('sensitive-response', { status: statusCode }))
    const read = createPrChecksReader('devIgor1/orbit', sha, 'test-only', request)
    await expect(read('statuses')).rejects.toThrow(`HTTP ${statusCode}`)
    await expect(read('statuses')).rejects.not.toThrow('sensitive-response')
  })

  it('rejects incomplete pagination, malformed responses and network failures', async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => Response.json([], { headers: { link: '<https://api.github.com/next>; rel="next"' } }))
    const read = createPrChecksReader('devIgor1/orbit', sha, 'test-only', request)
    await expect(read('statuses')).rejects.toThrow('Paginação')
    request.mockResolvedValueOnce(Response.json({ error: 'invalid' }))
    await expect(read('statuses')).rejects.toThrow()
    request.mockRejectedValueOnce(new Error('network unavailable'))
    await expect(read('statuses')).rejects.toThrow('network unavailable')
  })

  it.each([
    ['devIgor1/orbit', '', 'token'], ['invalid', sha, 'token'], ['devIgor1/orbit', sha, ''],
  ])('rejects missing or unsafe execution configuration', (repository, commit, token) => {
    expect(() => createPrChecksReader(repository, commit, token)).toThrow('inválido')
  })
})
