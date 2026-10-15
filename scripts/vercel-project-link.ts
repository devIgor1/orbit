import { z } from 'zod'

const projectSchema = z.object({
  id: z.string().regex(/^prj_[a-zA-Z0-9]+$/),
  accountId: z.string().regex(/^team_[a-zA-Z0-9]+$/),
  name: z.string(),
  link: z.object({ type: z.literal('github'), org: z.string(), repo: z.string() }),
})

export async function loadVercelProjectLink(
  token: string | undefined,
  projectName: string,
  repository: string,
  request: typeof fetch = fetch,
) {
  if (!token) throw new Error('Configure VERCEL_TOKEN.')
  if (!projectName || !repository) throw new Error('Configure o projeto e o repositório do deploy.')
  // Project-scoped tokens resolve their owner on this endpoint without /user or /teams.
  const response = await request(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Não foi possível consultar o projeto Vercel (HTTP ${response.status}).`)
  const project = projectSchema.safeParse(await response.json())
  if (!project.success || project.data.name !== projectName
    || `${project.data.link.org}/${project.data.link.repo}`.toLowerCase() !== repository.toLowerCase()) {
    throw new Error('O projeto Vercel não corresponde ao repositório deste deploy.')
  }
  return { projectId: project.data.id, orgId: project.data.accountId, projectName: project.data.name }
}
