import { parseEnv } from 'node:util'
import { describe, expect, it } from 'vitest'
import { prepareFrontendEnvironment } from '../scripts/frontend-deployment-env'

const project = 'twsfyqkagyvibsilulle'
const environment = {
  VITE_SUPABASE_URL: `https://${project}.supabase.co`,
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-only-public-key',
}
const redacted = 'VITE_SUPABASE_URL="[SENSITIVE]"\nVITE_SUPABASE_PUBLISHABLE_KEY="[SENSITIVE]"\n'

describe('public frontend build configuration', () => {
  it('fills redacted values while preserving unrelated Vercel configuration verbatim', () => {
    const other = 'OTHER_VALUE="line one\nline two"\n'
    const output = prepareFrontendEnvironment(other + redacted, { ...environment, SECRET_TOKEN: 'never-copy' }, project)
    expect(output).toContain(other)
    expect(parseEnv(output)).toEqual({ ...environment, OTHER_VALUE: 'line one\nline two' })
    expect(output).not.toContain('never-copy')
  })

  it('accepts matching public values and supports a repeat without duplicating assignments', () => {
    const first = prepareFrontendEnvironment(redacted, environment, project)
    expect(prepareFrontendEnvironment(first, environment, project)).toBe(first)
  })

  it.each(Object.keys(environment))('blocks divergence in %s instead of hiding it', key => {
    expect(() => prepareFrontendEnvironment(`${key}="another-value"\n`, environment, project)).toThrow('diverge')
  })

  it.each(['', '[SENSITIVE]', 'sb_secret_test-only-key'])('blocks missing, redacted or administrative public keys', key => {
    expect(() => prepareFrontendEnvironment(redacted, { ...environment, VITE_SUPABASE_PUBLISHABLE_KEY: key }, project)).toThrow('chave pública')
  })

  it('blocks a connection to another Supabase project', () => {
    expect(() => prepareFrontendEnvironment(redacted, { ...environment, VITE_SUPABASE_URL: 'https://other.supabase.co' }, project)).toThrow('mesmo Supabase')
  })
})
