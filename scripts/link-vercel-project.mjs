import { mkdir, writeFile } from 'node:fs/promises'
import { loadVercelProjectLink } from './vercel-project-link.ts'

const link = await loadVercelProjectLink(
  process.env.VERCEL_TOKEN,
  process.env.VERCEL_PROJECT ?? '',
  process.env.GITHUB_REPOSITORY ?? '',
)
await mkdir('.vercel', { recursive: true })
await writeFile('.vercel/project.json', JSON.stringify(link))
console.log('Projeto Vercel confirmado e vinculado ao repositório do deploy.')
