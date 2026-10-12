import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../../src/lib/supabase/database.generated.ts'
import { required } from './config.ts'
import { GithubError } from './errors.ts'

export const adminClient = () =>
  createClient<Database>(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
export type GithubDatabase = ReturnType<typeof adminClient>
export async function authenticate(request: Request, db: GithubDatabase) {
  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) throw new GithubError('AUTH_REQUIRED', 401)
  const { data, error } = await db.auth.getUser(authorization.slice(7))
  if (error && (!error.status || error.status >= 500)) throw new GithubError('GITHUB_FAILED', 503)
  if (error || !data.user) throw new GithubError('AUTH_REQUIRED', 401)
  return data.user.id
}
export function confirmed<T>({ data, error }: { data: T; error: unknown }): NonNullable<T> {
  if (error) throw error
  if (data === null || data === undefined) throw new GithubError('GITHUB_CONTRACT', 503)
  return data
}
export async function requireMember(db: GithubDatabase, userId: string, workspaceId: string, admin = false) {
  const { data: member, error } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .is('removed_at', null)
    .maybeSingle()
  if (error) throw error
  if (!member || (admin && member.role !== 'admin')) throw new GithubError('FORBIDDEN', 403)
}
