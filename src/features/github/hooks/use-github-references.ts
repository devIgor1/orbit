import { useInfiniteQuery } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import { fetchGithubReferences } from '../services/github-references'
import type { GithubPullFilter, GithubReferenceKind } from '../schemas/github-reference-schema'

export function useGithubReferences(
  taskId: string,
  repositoryId: string,
  kind: GithubReferenceKind,
  state: GithubPullFilter,
) {
  const scope = useQueryScope()
  return useInfiniteQuery({
    queryKey: ['github', scope.userId, scope.workspaceId, 'references', taskId, repositoryId, kind, state],
    enabled: scope.enabled && Boolean(taskId) && Boolean(repositoryId),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchGithubReferences(
        {
          workspaceId: scope.requireScope().workspaceId,
          taskId,
          repositoryId,
          kind,
          state,
          page: pageParam,
        },
        signal,
      ),
    getNextPageParam: (last) => last.nextPage,
    staleTime: 30_000,
    retry: false,
  })
}
