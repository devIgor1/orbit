import { describe, expect, it } from 'vitest'
import { assertBackendReady, assertCurrentCommit, assertProductionTarget } from '../scripts/deployment-checks'

const project = 'twsfyqkagyvibsilulle'
const environment = { VITE_SUPABASE_URL: `https://${project}.supabase.co`, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test-only-public-key' }
const migrations = { upToDate: true, migrations: [] }
const functions = { functions: [
  { slug: 'github-api', status: 'ACTIVE', verify_jwt: false },
  { slug: 'send-invitation', status: 'ACTIVE', verify_jwt: true },
] }
const config = '[functions.github-api]\nverify_jwt = false\n\n[functions.send-invitation]\nverify_jwt = true\n'

describe('production deployment gates', () => {
  it('accepts the configured frontend and ready backend', () => {
    expect(() => assertProductionTarget(environment, project)).not.toThrow()
    expect(() => assertBackendReady(migrations, functions, config)).not.toThrow()
  })

  it.each(['http://127.0.0.1:55921', 'https://another-project.supabase.co', ''])('rejects a frontend using %s', url => {
    expect(() => assertProductionTarget({ ...environment, VITE_SUPABASE_URL: url }, project)).toThrow('mesmo Supabase')
  })

  it.each(['', 'sb_secret_test-only-key', 'malformed'])('rejects missing, secret or malformed client keys', key => {
    expect(() => assertProductionTarget({ ...environment, VITE_SUPABASE_PUBLISHABLE_KEY: key }, project)).toThrow('chave pública')
  })

  it('accepts legacy anon keys only for the deployment project', () => {
    const key = (role: string, ref: string) => `header.${Buffer.from(JSON.stringify({ role, ref })).toString('base64url')}.signature`
    expect(() => assertProductionTarget({ ...environment, VITE_SUPABASE_PUBLISHABLE_KEY: key('anon', project) }, project)).not.toThrow()
    for (const invalid of [key('service_role', project), key('anon', 'another-project')]) {
      expect(() => assertProductionTarget({ ...environment, VITE_SUPABASE_PUBLISHABLE_KEY: invalid }, project)).toThrow('chave pública')
    }
  })

  it.each([{ upToDate: false, migrations: ['pending.sql'] }, { upToDate: true, migrations: ['pending.sql'] }, {}, null])('blocks unconfirmed migrations', state => {
    expect(() => assertBackendReady(state, functions, config)).toThrow('Migrations não confirmadas')
  })

  it.each([
    { functions: [] },
    { functions: [{ ...functions.functions[0], status: 'FAILED' }, functions.functions[1]] },
    { functions: [functions.functions[0], { ...functions.functions[1], verify_jwt: false }] },
  ])('blocks missing, failed or incorrectly authenticated functions', state => {
    expect(() => assertBackendReady(migrations, state, config)).toThrow('Frontend bloqueado')
  })

  it('refuses missing function declarations or implicit JWT verification', () => {
    expect(() => assertBackendReady(migrations, functions, '')).toThrow('Nenhuma Edge Function')
    expect(() => assertBackendReady(migrations, functions, '[functions.github-api]\n')).toThrow('verify_jwt')
  })

  it('refuses old commits on retries and while a deploy is running', () => {
    const sha = 'a'.repeat(40)
    expect(() => assertCurrentCommit(sha, `${sha}\trefs/heads/main\n`)).not.toThrow()
    expect(() => assertCurrentCommit('b'.repeat(40), `${sha}\trefs/heads/main\n`)).toThrow('main avançou')
    expect(() => assertCurrentCommit(undefined, '')).toThrow('main avançou')
  })
})
