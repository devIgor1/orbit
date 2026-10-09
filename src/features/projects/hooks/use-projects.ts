import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import * as service from '../services/projects-service'

export { PROJECTS_PAGE_SIZE } from '../services/projects-service'

export function useProjects(filters: service.ProjectFilters = {}) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['projects', scope.userId, scope.workspaceId, filters],
    queryFn: () => service.fetchProjects(scope.requireScope().workspaceId, filters),
    enabled: scope.enabled,
  })
}

export function useProject(projectId: string) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['project', scope.userId, scope.workspaceId, projectId],
    queryFn: () => service.fetchProject(scope.requireScope().workspaceId, projectId),
    enabled: scope.enabled && Boolean(projectId),
  })
}

export function useProjectMutations() {
  const scope = useQueryScope()
  const cache = useQueryClient()
  const onSuccess = async () => {
    await Promise.all(['projects', 'project', 'dashboard', 'activity'].map((key) =>
      cache.invalidateQueries({ queryKey: [key, scope.userId, scope.workspaceId] })))
  }
  const createProject = useMutation({
    mutationFn: (input: service.ProjectInput) => {
      const { workspaceId, userId } = scope.requireScope()
      return service.createProject(workspaceId, userId, input)
    }, onSuccess,
  })
  const updateProject = useMutation({
    mutationFn: (input: Partial<service.ProjectInput> & { id: string }) => service.updateProject(scope.requireScope().workspaceId, input), onSuccess,
  })
  const archiveProject = useMutation({
    mutationFn: (id: string) => service.updateProject(scope.requireScope().workspaceId, { id, status: 'archived' }), onSuccess,
  })
  return { createProject, updateProject, archiveProject }
}
