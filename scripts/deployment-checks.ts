import { z } from 'zod'

export function assertCurrentCommit(expected: string | undefined, remote: string) {
  if (!expected || !/^[a-f0-9]{40}$/.test(expected) || remote.trim().split(/\s+/)[0] !== expected) {
    throw new Error('A main avançou. Publique o commit atual; não reexecute um deploy antigo.')
  }
}

export function assertProductionTarget(environment: Record<string, string>, projectId: string) {
  if (!/^[a-z0-9]{20}$/.test(projectId)) throw new Error('Projeto Supabase inválido.')
  if (environment.VITE_SUPABASE_URL !== `https://${projectId}.supabase.co`) {
    throw new Error('O frontend não está configurado para o mesmo Supabase do deploy.')
  }
  const key = environment.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
  if (key.startsWith('sb_publishable_') && key.length > 20) return
  try {
    const payload: unknown = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString())
    if (z.object({ role: z.literal('anon'), ref: z.literal(projectId) }).safeParse(payload).success) return
  } catch { /* Report a safe configuration error below, without printing the key. */ }
  throw new Error('Configure uma chave pública do Supabase; chaves administrativas são recusadas.')
}

export function assertBackendReady(migrations: unknown, functions: unknown, config: string) {
  const migrationState = z.object({ upToDate: z.literal(true), migrations: z.array(z.string()).length(0) })
  if (!migrationState.safeParse(migrations).success) throw new Error('Migrations não confirmadas. Frontend bloqueado.')
  const deployed = z.object({ functions: z.array(z.object({
    slug: z.string(), status: z.string(), verify_jwt: z.boolean(),
  })) }).parse(functions).functions
  const sections = [...config.matchAll(/^\[functions\.([\w-]+)\]\s*\n([^[]*)/gm)]
  if (!sections.length) throw new Error('Nenhuma Edge Function declarada.')
  for (const [, name, settings] of sections) {
    const jwt = /^verify_jwt\s*=\s*(true|false)\s*$/m.exec(settings)?.[1]
    if (!jwt) throw new Error(`Declare verify_jwt explicitamente para ${name}.`)
    const remote = deployed.find(fn => fn.slug === name)
    if (!remote || remote.status !== 'ACTIVE' || remote.verify_jwt !== (jwt === 'true')) {
      throw new Error(`Edge Function ${name} não confirmada. Frontend bloqueado.`)
    }
  }
}
