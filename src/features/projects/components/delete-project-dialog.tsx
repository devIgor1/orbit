import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState } from '@/components/shared/query-state'
import type { Project } from '@/lib/supabase/database.types'
import { useTrashMutation } from '@/features/trash/hooks/use-trash'

type Props = { project: Project; taskCount: number; open: boolean; onOpenChange: (open: boolean) => void }

export function DeleteProjectDialog({ project, taskCount, open, onOpenChange }: Props) {
  const remove = useTrashMutation()
  const navigate = useNavigate()
  async function confirm() {
    try {
      await remove.mutateAsync({ kind: 'project', action: 'delete', id: project.id })
      onOpenChange(false)
      navigate('/projects')
    } catch {
      /* Keep the dialog open with the error. */
    }
  }
  const tasks = taskCount === 1 ? '1 tarefa' : `${taskCount} tarefas`
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!remove.isPending) onOpenChange(value)
      }}
      title="Excluir este projeto?"
      description={`“${project.title}” e ${tasks} vão para a lixeira. Você pode restaurar em até 15 dias; depois, tudo é apagado definitivamente.`}
    >
      <p className="dialog-note">Se quiser apenas tirar o projeto de circulação, prefira arquivá-lo.</p>
      {remove.isError && <ErrorState error={remove.error} />}
      <div className="form-actions">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={remove.isPending}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={() => void confirm()} disabled={remove.isPending}>
          {remove.isPending ? 'Excluindo…' : 'Mover para a lixeira'}
        </Button>
      </div>
    </Dialog>
  )
}
