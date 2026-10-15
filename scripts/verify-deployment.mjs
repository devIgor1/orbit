import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'
import { assertBackendReady, assertCurrentCommit, assertProductionTarget } from './deployment-checks.ts'

function query(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
}

const mode = process.argv[2]
if (mode === 'commit') {
  assertCurrentCommit(process.env.GITHUB_SHA, query('git', ['ls-remote', 'origin', 'refs/heads/main']))
} else if (mode === 'target') {
  assertProductionTarget(parseEnv(readFileSync('.vercel/.env.production.local', 'utf8')), process.env.SUPABASE_PROJECT_ID ?? '')
} else if (mode === 'backend') {
  const migrations = JSON.parse(query('supabase', ['db', 'push', '--linked', '--dry-run', '--output-format', 'json']))
  const functions = JSON.parse(query('supabase', ['functions', 'list', '--project-ref', process.env.SUPABASE_PROJECT_ID, '--output-format', 'json']))
  assertBackendReady(migrations, functions, readFileSync('supabase/config.toml', 'utf8'))
} else {
  throw new Error('Use verify-deployment.mjs target, commit ou backend.')
}
console.log(`Verificação de deploy (${mode}): aprovada.`)
