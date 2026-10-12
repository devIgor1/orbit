import { AppError } from '@/lib/errors/app-error'
import {
  githubReferencePageSchema,
  type GithubPullFilter,
  type GithubReferenceKind,
} from '../schemas/github-reference-schema'
import { invokeGithub } from './github-api'

type ReferenceInput = {
  workspaceId: string
  taskId: string
  repositoryId: string
  kind: GithubReferenceKind
  state: GithubPullFilter
  page: number
}
export async function fetchGithubReferences(input: ReferenceInput, signal?: AbortSignal) {
  const result = await invokeGithub({ action: 'references', ...input }, githubReferencePageSchema, signal)
  if (result.kind !== input.kind || (result.nextPage !== null && result.nextPage !== input.page + 1))
    throw new AppError('contract', 'O GitHub não confirmou a lista solicitada. Atualize as opções e tente novamente.')
  return result
}
