import { required } from '../_shared/github/config.ts'
import { equalSecret } from '../_shared/github/crypto.ts'
import { adminClient } from '../_shared/github/database.ts'
import { githubFailure } from '../_shared/github/errors.ts'
import { processGithubJobs } from './process.ts'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 })
  try {
    if (!(await equalSecret(request.headers.get('x-orbit-worker-secret') ?? '', required('GITHUB_WORKER_SECRET'))))
      return new Response(null, { status: 401 })
    return Response.json({ results: await processGithubJobs(adminClient()) })
  } catch (error) {
    const failure = githubFailure(error)
    console.error('github-worker', { code: failure.code })
    return Response.json({ code: failure.code }, { status: failure.status })
  }
})
