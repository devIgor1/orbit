import { z } from 'zod'

// Add external integrations here; Actions jobs belong in pr-validation.needs.
export const requiredPrStatuses = [{ context: 'Vercel', creator: 'vercel[bot]' }]
export const requiredPrChecks = [{ name: 'Vercel Preview Comments', appId: 8329 }]

const jobsSchema = z.record(z.string(), z.object({ result: z.string() }))
const statusesSchema = z.array(z.object({
  id: z.number(), context: z.string(), state: z.string(),
  creator: z.object({ login: z.string() }).nullable(),
}))
const checksSchema = z.array(z.object({
  id: z.number(), name: z.string(), head_sha: z.string(),
  status: z.string(), conclusion: z.string().nullable(),
  app: z.object({ id: z.number() }).nullable(),
}))

export function assertPrJobsSucceeded(value: unknown) {
  const jobs = jobsSchema.parse(value)
  if (!jobs.quality) throw new Error('CI obrigatório ausente: quality.')
  for (const [name, job] of Object.entries(jobs)) {
    if (job.result !== 'success') throw new Error(`Validação ${name} não aprovada (${job.result}).`)
  }
}

export function evaluatePrPreview(statusData: unknown, checkData: unknown, sha: string) {
  const statuses = statusesSchema.parse(statusData).sort((a, b) => b.id - a.id)
  const checks = checksSchema.parse(checkData).sort((a, b) => b.id - a.id)
  const pending: string[] = []
  for (const required of requiredPrStatuses) {
    const status = statuses.find(item => item.context === required.context)
    if (!status) { pending.push(required.context); continue }
    if (status.creator?.login !== required.creator) throw new Error(`Origem inesperada: ${required.context}.`)
    if (status.state === 'pending') pending.push(required.context)
    else if (status.state !== 'success') throw new Error(`Preview não aprovado: ${required.context}.`)
  }
  for (const required of requiredPrChecks) {
    const check = checks.find(item => item.name === required.name)
    if (!check) { pending.push(required.name); continue }
    if (check.app?.id !== required.appId || check.head_sha !== sha) {
      throw new Error(`Origem ou commit inesperado: ${required.name}.`)
    }
    if (check.status !== 'completed') pending.push(required.name)
    else if (check.conclusion !== 'success') throw new Error(`Preview não aprovado: ${required.name}.`)
  }
  return pending
}
