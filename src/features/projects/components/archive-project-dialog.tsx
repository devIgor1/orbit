import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ErrorState } from '@/components/shared/query-state'
import type { Project } from '@/lib/supabase/database.types'
import { useProjectMutations } from '../hooks/use-projects'

export function ArchiveProjectDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { archiveProject } = useProjectMutations()
  const navigate = useNavigate()
  async function archive() {
    try {
      await archiveProject.mutateAsync(project.id)
      onOpenChange(false)
      navigate('/projects?status=archived')
    } catch { /* Retain this dialog and expose the mutation error. */ }
  }
  return <Dialog open={open} onOpenChange={value => { if (!archiveProject.isPending) onOpenChange(value) }} title="Arquivar este projeto?" description={`“${project.title}” continuará disponível na aba Arquivados, com suas tarefas e histórico preservados.`}>
    {archiveProject.error && <ErrorState error={archiveProject.error} />}
    <div className="form-actions"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={archiveProject.isPending}>Cancelar</Button><Button onClick={() => void archive()} disabled={archiveProject.isPending}>{archiveProject.isPending ? 'Arquivando…' : 'Arquivar projeto'}</Button></div>
  </Dialog>
}
