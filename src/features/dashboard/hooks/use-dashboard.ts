import { useQuery } from '@tanstack/react-query'
import { useQueryScope } from '@/features/workspace/use-query-scope'
import { fetchActivity, fetchDashboard } from '../services/dashboard-service'

export function useDashboard(days = 7) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['dashboard', scope.userId, scope.workspaceId, days],
    queryFn: () => fetchDashboard(scope.requireScope().workspaceId, days),
    enabled: scope.enabled,
  })
}

export function useActivity(limit = 8) {
  const scope = useQueryScope()
  return useQuery({
    queryKey: ['activity', scope.userId, scope.workspaceId, limit],
    queryFn: () => fetchActivity(scope.requireScope().workspaceId, limit),
    enabled: scope.enabled,
  })
}
