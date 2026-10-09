import { useAuth } from '@/features/auth/use-auth'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { AppError } from '@/lib/errors/app-error'

export function useQueryScope() {
  const { user } = useAuth()
  const workspaceQuery = useWorkspace()
  const workspaceId = workspaceQuery.isSuccess ? workspaceQuery.data.workspace.id : undefined
  return {
    userId: user?.id,
    workspaceId,
    enabled: Boolean(user && workspaceId),
    requireScope() {
      if (!user) throw new AppError('authentication', 'Entre na sua conta para continuar.')
      if (!workspaceId) throw new AppError('permission', 'Selecione um workspace válido para continuar.')
      return { userId: user.id, workspaceId }
    },
  }
}
