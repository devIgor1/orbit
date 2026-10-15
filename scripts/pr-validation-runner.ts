import { setTimeout } from 'node:timers/promises'
import { assertPrJobsSucceeded, evaluatePrPreview } from './pr-validation-policy.ts'

type GateOptions = {
  jobs: unknown
  sha: string
  readChecks: (kind: 'statuses' | 'check-runs') => Promise<unknown[]>
  attempts?: number
  wait?: () => Promise<unknown>
  report?: (message: string) => void
}

export async function waitForPrValidations({
  jobs, sha, readChecks, attempts = 60, wait = () => setTimeout(10_000), report = console.log,
}: GateOptions) {
  assertPrJobsSucceeded(jobs)
  for (let attempt = 0; attempt < attempts; attempt++) {
    const [statuses, checks] = await Promise.all([readChecks('statuses'), readChecks('check-runs')])
    const pending = evaluatePrPreview(statuses, checks, sha)
    if (pending.length === 0) return
    report(`Aguardando: ${pending.join(', ')}.`)
    if (attempt + 1 < attempts) await wait()
  }
  throw new Error('Validações ausentes ou pendentes após o prazo. Reexecute o CI após concluir o preview.')
}
