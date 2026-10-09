import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { execSync, spawnSync } from 'node:child_process'

// Local-only provisioner: administrative credentials never enter Vite or source.
const status = JSON.parse(execSync('npx --yes supabase status -o json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
if (!status.API_URL?.startsWith('http://127.0.0.1:55521')) throw new Error('Expected isolated local Orbit Supabase on port 55521.')
const credentialsPath = '.demo-credentials.json'
const existing = existsSync(credentialsPath) ? JSON.parse(readFileSync(credentialsPath, 'utf8')) : null
const password = existing?.password ?? randomBytes(24).toString('base64url')
const accounts = [
  { email: 'marina@orbit.local', full_name: 'Marina Costa' },
  { email: 'rafael@orbit.local', full_name: 'Rafael Oliveira' },
  { email: 'beatriz@orbit.local', full_name: 'Beatriz Lima' },
  { email: 'lucas@orbit.local', full_name: 'Lucas Martins' },
]
const headers = { 'Content-Type': 'application/json', apikey: status.SERVICE_ROLE_KEY, Authorization: `Bearer ${status.SERVICE_ROLE_KEY}` }
const listResponse = await fetch(`${status.API_URL}/auth/v1/admin/users`, { headers })
if (!listResponse.ok) throw new Error(`Auth account lookup failed (${listResponse.status}).`)
const listing = await listResponse.json()
for (const account of accounts) {
  if (listing.users.some((user) => user.email === account.email)) continue
  const response = await fetch(`${status.API_URL}/auth/v1/admin/users`, {
    method: 'POST', headers,
    body: JSON.stringify({ email: account.email, password, email_confirm: true, user_metadata: { full_name: account.full_name } }),
  })
  if (!response.ok) throw new Error(`Auth provisioning failed (${response.status}).`)
}
writeFileSync(credentialsPath, JSON.stringify({ email: accounts[0].email, password }, null, 2) + '\n')
writeFileSync('.env.local', `VITE_SUPABASE_URL=${status.API_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY ?? status.ANON_KEY}\n`)
const result = spawnSync('docker', ['exec', '-i', 'supabase_db_orbit', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
  input: readFileSync('supabase/seed.sql'), encoding: 'utf8',
})
if (result.status !== 0) throw new Error(result.stderr || 'Seed failed.')
console.log('Orbit local workspace provisioned. Credentials: .demo-credentials.json (local only).')
