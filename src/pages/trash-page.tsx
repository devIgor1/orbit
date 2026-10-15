import { PageHeader } from '@/components/layout/page-header'
import { ConnectionState, EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { useTrash } from '@/features/trash/hooks/use-trash'
import { TrashList } from '@/features/trash/components/trash-list'

export function TrashPage() {
  const workspace = useWorkspace()
  const isAdmin = workspace.isSuccess && workspace.data.role === 'admin'
  const trash = useTrash(isAdmin)
  return (
    <div className="page-content">
      <PageHeader
        eyebrow="NADA SE PERDE"
        title="Lixeira"
        description="Restaure projetos e tarefas excluídos nos últimos 15 dias."
      />
      <div className="panel trash-panel">
        {!isSupabaseConfigured ? (
          <ConnectionState />
        ) : workspace.isError ? (
          <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} />
        ) : workspace.isPending ? (
          <LoadingState label="Abrindo a lixeira…" />
        ) : !isAdmin ? (
          <EmptyState
            title="Acesso restrito"
            description="Somente administradores da empresa podem ver e restaurar itens excluídos."
          />
        ) : trash.isError ? (
          <ErrorState error={trash.error} onRetry={() => void trash.refetch()} />
        ) : trash.isPending ? (
          <LoadingState label="Abrindo a lixeira…" />
        ) : (
          <TrashList trash={trash.data} />
        )}
      </div>
    </div>
  )
}
