import { parseEnv } from 'node:util'
import { assertProductionTarget } from './deployment-checks.ts'

const publicKeys = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const

export function prepareFrontendEnvironment(contents: string, configured: Record<string, string>, projectId: string) {
  const publicEnvironment = Object.fromEntries(publicKeys.map(key => [key, configured[key] ?? '']))
  assertProductionTarget(publicEnvironment, projectId)
  const pulled = parseEnv(contents)
  for (const key of publicKeys) {
    if (pulled[key] && pulled[key] !== '[SENSITIVE]' && pulled[key] !== publicEnvironment[key]) {
      throw new Error(`A variável pública ${key} diverge entre GitHub e Vercel. Frontend bloqueado.`)
    }
  }
  // CLI output writes one assignment per public value; preserve all other entries verbatim.
  const remaining = contents.replace(/^VITE_SUPABASE_(URL|PUBLISHABLE_KEY)=.*\r?\n?/gm, '')
  return `${remaining.trimEnd()}\n${publicKeys.map(key => `${key}=${JSON.stringify(publicEnvironment[key])}`).join('\n')}\n`
}
