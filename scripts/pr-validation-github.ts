import { z } from 'zod'

export function createPrChecksReader(repository: string, sha: string, token: string, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[a-f0-9]{40}$/.test(sha) || !token) {
    throw new Error('Repositório, commit ou autenticação do PR ausente/inválido.')
  }
  const base = `https://api.github.com/repos/${repository}/commits/${sha}`
  return async function readChecks(kind: 'statuses' | 'check-runs') {
    const items: unknown[] = []
    // Fail closed if the response cannot be read in full.
    for (let page = 1; page <= 20; page++) {
      const response = await request(`${base}/${kind}?per_page=100&page=${page}&filter=latest`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
        signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error(`Consulta de ${kind} recusada pelo GitHub (HTTP ${response.status}).`)
      const data: unknown = await response.json()
      items.push(...(kind === 'statuses' ? z.array(z.unknown()).parse(data)
        : z.object({ check_runs: z.array(z.unknown()) }).parse(data).check_runs))
      if (!response.headers.get('link')?.includes('rel="next"')) return items
    }
    throw new Error('Paginação dos checks incompleta; merge bloqueado.')
  }
}
