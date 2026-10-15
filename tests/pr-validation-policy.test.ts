import { describe, expect, it } from 'vitest'
import { assertPrJobsSucceeded, evaluatePrPreview } from '../scripts/pr-validation-policy'

const sha = 'a'.repeat(40)
const status = { id: 2, context: 'Vercel', state: 'success', creator: { login: 'vercel[bot]' } }
const check = { id: 2, name: 'Vercel Preview Comments', head_sha: sha, status: 'completed', conclusion: 'success', app: { id: 8329 } }

describe('required PR validations', () => {
  it('accepts quality and additional connected jobs only when all succeed', () => {
    expect(() => assertPrJobsSucceeded({ quality: { result: 'success' }, security: { result: 'success' } })).not.toThrow()
    expect(() => assertPrJobsSucceeded({ quality: { result: 'success' }, security: { result: 'failure' } })).toThrow('security')
  })

  it.each(['failure', 'cancelled', 'skipped', 'pending'])('rejects a %s dependency instead of passing a skipped gate', result => {
    expect(() => assertPrJobsSucceeded({ quality: { result } })).toThrow('quality')
  })

  it.each([{}, null, { other: { result: 'success' } }])('rejects absent quality evidence', jobs => {
    expect(() => assertPrJobsSucceeded(jobs)).toThrow()
  })

  it('waits for both required integrations when there is no evidence', () => {
    expect(evaluatePrPreview([], [], sha)).toEqual(['Vercel', 'Vercel Preview Comments'])
    expect(evaluatePrPreview([{ ...status, state: 'pending' }], [{ ...check, status: 'in_progress', conclusion: null }], sha)).toHaveLength(2)
  })

  it('accepts only the latest result, independent of pagination order', () => {
    const oldStatus = { ...status, id: 1, state: 'failure' }
    const oldCheck = { ...check, id: 1, conclusion: 'failure' }
    expect(evaluatePrPreview([oldStatus, status], [check, oldCheck], sha)).toEqual([])
    expect(() => evaluatePrPreview([status, { ...oldStatus, id: 3 }], [check], sha)).toThrow('não aprovado')
    expect(() => evaluatePrPreview([status], [check, { ...oldCheck, id: 3 }], sha)).toThrow('não aprovado')
  })

  it.each(['failure', 'error', 'unknown'])('rejects a Vercel status of %s', state => {
    expect(() => evaluatePrPreview([{ ...status, state }], [check], sha)).toThrow('não aprovado')
  })

  it.each(['failure', 'cancelled', 'timed_out', 'neutral', 'skipped', null])('rejects a check conclusion of %s', conclusion => {
    expect(() => evaluatePrPreview([status], [{ ...check, conclusion }], sha)).toThrow('não aprovado')
  })

  it('rejects old commits and a different publisher with the same check name', () => {
    expect(() => evaluatePrPreview([{ ...status, creator: { login: 'other' } }], [check], sha)).toThrow('Origem')
    expect(() => evaluatePrPreview([status], [{ ...check, app: { id: 15368 } }], sha)).toThrow('Origem')
    expect(() => evaluatePrPreview([status], [{ ...check, head_sha: 'b'.repeat(40) }], sha)).toThrow('commit')
  })

  it('does not replace malformed backend responses with empty or successful results', () => {
    expect(() => evaluatePrPreview(null, [check], sha)).toThrow()
    expect(() => evaluatePrPreview([status], [{}], sha)).toThrow()
  })
})
