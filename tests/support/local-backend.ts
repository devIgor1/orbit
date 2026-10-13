import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'

const credentialsSchema = z.object({ email: z.string(), password: z.string() })
const backendSchema = z.object({
  API_URL: z.literal('http://127.0.0.1:55521'),
  ANON_KEY: z.string().min(1),
  SERVICE_ROLE_KEY: z.string().min(1),
  credentialsPath: z.string().default('.demo-credentials.json'),
})

// Explicit overrides support native Auth/PostgREST when Docker is unavailable.
// Remote backends are deliberately rejected before any test writes occur.
export async function localBackend() {
  const raw = process.env.ORBIT_LOCAL_SUPABASE_CONFIG
    ? await readFile(process.env.ORBIT_LOCAL_SUPABASE_CONFIG, 'utf8')
    : execSync('npx supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const config = backendSchema.parse(JSON.parse(raw))
  const credentials = credentialsSchema.parse(JSON.parse(await readFile(config.credentialsPath, 'utf8')))
  return { ...config, credentials }
}
