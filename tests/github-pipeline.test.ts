// @vitest-environment node
import { generateKeyPairSync } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { expect, it, vi } from 'vitest'
import type { Database } from '@/lib/supabase/database.types'
import { processGithubJobs } from '../supabase/functions/github-worker/process'
import { localBackend } from './support/local-backend'

it.skipIf(process.env.ORBIT_GITHUB_DB_TESTS !== '1')('recovers an uncertain GitHub POST using the real local database and worker',async () => {
  const local = await localBackend()
  const admin = createClient<Database>(local.API_URL,local.SERVICE_ROLE_KEY,{ auth: { persistSession: false,autoRefreshToken: false } })
  const session = createClient<Database>(local.API_URL,local.ANON_KEY,{ auth: { persistSession: false,autoRefreshToken: false } })
  const { data: auth,error: authError } = await session.auth.signInWithPassword(local.credentials)
  if (authError || !auth.user) throw new Error('Local test login failed')
  const userId = auth.user.id
  const workspaceId = crypto.randomUUID(); const projectId = crypto.randomUUID(); const taskId = crypto.randomUUID()
  const { privateKey } = generateKeyPairSync('rsa',{ modulusLength: 2048 })
  const secrets: Record<string,string> = { GITHUB_APP_ID: '100',GITHUB_APP_SLUG: 'orbit-test',ORBIT_APP_URL: 'https://orbit.example.test',
    GITHUB_PRIVATE_KEY_BASE64: Buffer.from(privateKey.export({ type: 'pkcs8',format: 'pem' })).toString('base64') }
  const realFetch = globalThis.fetch
  const comments: { id: number; body: string; user: { login: string; type: string } }[] = []
  let posts = 0
  async function must<T>({ data,error }: { data: T; error: unknown }) { if (error) throw error; return data }
  try {
    await must(await admin.from('workspaces').insert({ id: workspaceId,name: 'GitHub pipeline test' }))
    await must(await admin.from('workspace_members').insert({ workspace_id: workspaceId,user_id: userId,role: 'admin' }))
    await must(await admin.from('projects').insert({ id: projectId,workspace_id: workspaceId,title: 'Pipeline',created_by: userId }))
    await must(await admin.from('tasks').insert({ id: taskId,workspace_id: workspaceId,project_id: projectId,title: 'Entrega do pipeline',created_by: userId }))
    const repositoryId = await must(await admin.rpc('finish_github_connection',{ requester: userId,target_workspace: workspaceId,
      repository: { id: 10,installation_id: 20,full_name: 'orbit-test/pipeline',default_branch: 'main',private: true } }))
    if (!repositoryId) throw new Error('Repository missing')
    await must(await admin.rpc('link_task_github',{ requester: userId,target_workspace: workspaceId,target_task: taskId,target_repository: repositoryId,
      development: { branch: 'feat/test',head_repository_id: 10,pr_number: 42 } }))
    vi.stubGlobal('Deno',{ env: { get: (name: string) => secrets[name] } })
    vi.stubGlobal('fetch',async (input: string | URL | Request,init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input)
      if (url.hostname !== 'api.github.com') return realFetch(input,init)
      if (url.pathname.includes('/access_tokens')) return Response.json({ token: 'test-token' })
      if (url.pathname === '/repositories/10') return Response.json({ id: 10,full_name: 'orbit-test/pipeline',default_branch: 'main',private: true })
      if (url.pathname.endsWith('/pulls/42')) return Response.json({ number: 42,title: 'Entrega',state: 'closed',draft: false,
        merged_at: '2026-10-11T12:00:00Z',closed_at: '2026-10-11T12:00:00Z',head: { ref: 'feat/test',repo: { id: 10 } },base: { repo: { id: 10 } } })
      if (url.pathname.endsWith('/comments')) {
        if (init?.method !== 'POST') return Response.json(comments)
        posts++
        comments.push({ id: 123,body: JSON.parse(String(init.body)).body,user: { login: 'orbit-test[bot]',type: 'Bot' } })
        throw new TypeError('Simulated connection loss after GitHub accepted the comment')
      }
      throw new Error(`Unexpected fixture endpoint: ${url.pathname}`)
    })
    await processGithubJobs(admin)
    const failed = await must(await admin.from('task_github_links').select('*').eq('task_id',taskId).single())
    expect(failed).toMatchObject({ sync_status: 'error',comment_status: 'error',pr_state: 'merged',comment_id: null })
    expect(await must(await admin.from('tasks').select('status').eq('id',taskId).single())).toEqual({ status: 'done' })
    await must(await session.rpc('retry_task_github',{ target_workspace: workspaceId,target_task: taskId }))
    await processGithubJobs(admin)
    const recovered = await must(await admin.from('task_github_links').select('*').eq('task_id',taskId).single())
    expect(recovered).toMatchObject({ sync_status: 'synced',comment_status: 'sent',comment_id: 123 })
    expect(posts).toBe(1)
    await must(await session.rpc('unlink_task_github',{ target_workspace: workspaceId,target_task: taskId }))
    await must(await admin.rpc('link_task_github',{ requester: userId,target_workspace: workspaceId,target_task: taskId,target_repository: repositoryId,
      development: { branch: 'feat/test',head_repository_id: 10,pr_number: 42 } }))
    await processGithubJobs(admin)
    expect(posts).toBe(1)
    expect(await must(await admin.from('task_github_links').select('comment_id,comment_status').eq('task_id',taskId).single()))
      .toEqual({ comment_id: 123,comment_status: 'sent' })
  } finally {
    vi.unstubAllGlobals()
    await must(await admin.from('projects').delete().eq('workspace_id',workspaceId))
    await must(await admin.from('workspaces').delete().eq('id',workspaceId))
    await session.auth.signOut({ scope: 'local' })
  }
},30_000)
