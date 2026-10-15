import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { Database } from '../../src/lib/supabase/database.generated'

export function notificationTestConfig() {
  const path = process.env.ORBIT_NOTIFICATION_TEST_CONFIG
  if (!path) throw new Error('Set ORBIT_NOTIFICATION_TEST_CONFIG to the isolated Supabase status JSON.')
  const config = z.object({
    API_URL: z.literal('http://127.0.0.1:55621'), ANON_KEY: z.string().min(1), SERVICE_ROLE_KEY: z.string().min(1),
  }).parse(JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')))
  const credentials = z.object({ password: z.string().min(1) })
    .parse(JSON.parse(readFileSync(join(dirname(path), 'credentials.json'), 'utf8')))
  return { ...config, password: credentials.password }
}

export function confirmed<T>({ data, error }: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (error) throw new Error(error.message)
  if (data === null || data === undefined) throw new Error('Backend did not confirm the operation.')
  return data
}

export async function notificationSandbox() {
  const config = notificationTestConfig()
  const options = { auth: { persistSession: false, autoRefreshToken: false } }
  const admin = createClient<Database>(config.API_URL, config.SERVICE_ROLE_KEY, options)
  const owner = createClient<Database>(config.API_URL, config.ANON_KEY, options)
  const recipient = createClient<Database>(config.API_URL, config.ANON_KEY, options)
  const authorSession = await owner.auth.signInWithPassword({ email: 'marina@orbit.local', password: config.password })
  const memberSession = await recipient.auth.signInWithPassword({ email: 'rafael@orbit.local', password: config.password })
  if (authorSession.error) throw authorSession.error
  if (memberSession.error) throw memberSession.error
  const author = authorSession.data.user, member = memberSession.data.user
  const workspace = confirmed(await owner.rpc('create_company', { company_name: `Inbox ${crypto.randomUUID()}` })).id
  confirmed(await admin.from('workspace_members').insert({ workspace_id: workspace, user_id: member.id, role: 'member' }).select().single())
  confirmed(await recipient.rpc('select_company', { target_workspace: workspace }))
  const project = confirmed(await owner.from('projects').insert({ workspace_id: workspace, created_by: author.id, title: 'Identidade visual — Notificações' }).select().single())
  async function task(title = 'Revisar a identidade visual e os materiais de apresentação da campanha', assigned = false) {
    return confirmed(await owner.from('tasks').insert({ workspace_id: workspace, project_id: project.id, created_by: author.id, title, assignee_id: assigned ? member.id : null }).select().single())
  }
  return {
    config, admin, owner, recipient, author, member, workspace, project, task,
    async cleanup() {
      confirmed(await admin.from('projects').delete().eq('id', project.id).select().single())
      confirmed(await admin.from('workspaces').delete().eq('id', workspace).select().single())
      await Promise.all([owner.removeAllChannels(), recipient.removeAllChannels()])
      await Promise.all([owner.auth.signOut(), recipient.auth.signOut()])
    },
  }
}
