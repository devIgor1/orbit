import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/query-state'
import { useTrashMutation } from '@/features/trash/hooks/use-trash'

/** Moves the task to the trash after an inline confirmation. */
export function TaskDelete({ taskId, onDeleted }: { taskId: string; onDeleted: () => void }) {
  const remove = useTrashMutation()
  const [confirming, setConfirming] = useState(false)
  async function confirm() {
    try {
      await remove.mutateAsync({ kind: 'task', action: 'delete', id: taskId })
      onDeleted()
    } catch {
      /* The error stays visible next to the confirmation. */
    }
  }
  return (
    <section className="danger-zone" aria-label="Excluir tarefa">
      {confirming ? (
        <>
          <p>A tarefa vai para a lixeira, com comentários e histórico. Você pode restaurá-la em até 15 dias.</p>
          {remove.isError && <ErrorState error={remove.error} />}
          <div className="form-actions">
            <Button variant="outline" disabled={remove.isPending} onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => void confirm()}>
              {remove.isPending ? 'Excluindo…' : 'Mover para a lixeira'}
            </Button>
          </div>
        </>
      ) : (
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          <Trash2 aria-hidden="true" /> Excluir tarefa
        </Button>
      )}
    </section>
  )
}
