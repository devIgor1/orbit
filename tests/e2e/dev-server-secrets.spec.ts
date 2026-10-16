import { randomUUID } from 'node:crypto'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

test('dev server refuses backend secrets and local credentials, including raw imports', async ({ request }) => {
  const id = randomUUID()
  const secret = path.resolve(`.supabase/vite-access-${id}.env`)
  const credentials = path.resolve(`test-results/vite-credentials-${id}.json`)
  const canary = `server-only-${id}`
  await mkdir(path.dirname(secret), { recursive: true })
  await mkdir(path.dirname(credentials), { recursive: true })
  await writeFile(secret, `OPENAI_API_KEY=${canary}\n`)
  await writeFile(credentials, JSON.stringify({ password: canary }))
  try {
    for (const url of [
      `/.supabase/${path.basename(secret)}`,
      `/.supabase/${path.basename(secret)}?raw`,
      `/@fs/${secret.replaceAll('\\', '/')}?raw`,
      `/test-results/${path.basename(credentials)}`,
    ]) {
      const response = await request.get(url)
      expect(response.status(), url).toBe(403)
      expect(await response.text()).not.toContain(canary)
    }
  } finally {
    await Promise.all([unlink(secret), unlink(credentials)])
  }
})
