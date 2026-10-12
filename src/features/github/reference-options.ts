import type { GithubReferencePage } from './schemas/github-reference-schema'

export type GithubReferenceOption = {
  value: string
  label: string
  description: string
  disabled: boolean
  merged: boolean
}
const labels = { open: 'Aberto', draft: 'Rascunho', closed: 'Fechado', merged: 'Integrado' }

export function referenceOptions(pages: GithubReferencePage[]): GithubReferenceOption[] {
  const options = new Map<string, GithubReferenceOption>()
  for (const page of pages) {
    if (page.kind === 'branch') {
      for (const branch of page.items)
        options.set(branch.name, {
          value: branch.name,
          label: branch.name,
          description: '',
          disabled: false,
          merged: false,
        })
    } else {
      for (const pull of page.items)
        options.set(String(pull.number), {
          value: String(pull.number),
          label: `#${pull.number} · ${pull.title} · ${labels[pull.state]}`,
          description: `${pull.headRepository ?? 'Repositório de origem indisponível'}: ${pull.branch} → ${pull.baseBranch}`,
          disabled: pull.headRepository === null,
          merged: pull.state === 'merged',
        })
    }
  }
  return [...options.values()]
}
