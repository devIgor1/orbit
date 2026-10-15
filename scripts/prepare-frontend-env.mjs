import { readFile, writeFile } from 'node:fs/promises'
import { prepareFrontendEnvironment } from './frontend-deployment-env.ts'

const file = '.vercel/.env.production.local'
const contents = prepareFrontendEnvironment(await readFile(file, 'utf8'), {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
}, process.env.SUPABASE_PROJECT_ID ?? '')
await writeFile(file, contents)
console.log('Variáveis públicas do frontend verificadas e preparadas para o build.')
