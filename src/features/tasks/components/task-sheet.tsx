import { useState } from 'react'
import { Sheet } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'
import type { Task, TeamMember } from '@/lib/supabase/database.types'
import { useTaskMutations } from '../hooks/use-tasks'
import { taskStatusLabels, type TaskFormValues } from '../schemas/task-schema'
import { TaskForm } from './task-form'
import { TaskComments } from './task-comments'
import { TaskHistory } from './task-history'

type TaskSheetProps = { task: Task; members: TeamMember[]; onClose: () => void }

export function TaskSheet({ task, members, onClose }: TaskSheetProps) {
  const [tab, setTab] = useState<'details' | 'comments' | 'history'>('details')
  const { updateTask } = useTaskMutations(task.project_id)
  const [saved, setSaved] = useState(false)

  async function submit(values: TaskFormValues) {
    setSaved(false)
    try {
      await updateTask.mutateAsync({ id: task.id, ...values, description: values.description || null, due_date: values.due_date || null, assignee_id: values.assignee_id || null })
      setSaved(true)
    } catch { /* Preserve edits; TaskForm renders the confirmed backend error. */ }
  }

  return <Sheet open onOpenChange={value => { if (!value && !updateTask.isPending) onClose() }} title={task.title} description="Cada detalhe aproxima sua equipe da entrega.">
    <div className="task-detail-meta"><Badge status={task.status}>{taskStatusLabels[task.status]}</Badge><span>Criada em {formatDate(task.created_at)}</span></div>
    <div className="section-tabs" role="group" aria-label="Detalhes da tarefa">
      <button type="button" data-active={tab === 'details'} aria-pressed={tab === 'details'} onClick={() => setTab('details')}>Detalhes</button>
      <button type="button" data-active={tab === 'comments'} aria-pressed={tab === 'comments'} onClick={() => setTab('comments')}>Comentários</button>
      <button type="button" data-active={tab === 'history'} aria-pressed={tab === 'history'} onClick={() => setTab('history')}>Histórico</button>
    </div>
    {saved && <p role="status" className="form-success">Alterações salvas.</p>}
    <div hidden={tab !== 'details'} onChange={() => setSaved(false)}><TaskForm task={task} members={members} isPending={updateTask.isPending} error={updateTask.error} onSubmit={submit} onCancel={onClose} /></div>
    <div hidden={tab !== 'comments'}><TaskComments taskId={task.id} members={members} /></div>
    <div hidden={tab !== 'history'}><TaskHistory taskId={task.id} members={members} /></div>
  </Sheet>
}
