import { Dialog } from '@/components/ui/dialog'
import type { Task, TeamMember } from '@/lib/supabase/database.types'
import { useTaskMutations } from '../hooks/use-tasks'
import { TaskForm } from './task-form'
import type { TaskFormValues } from '../schemas/task-schema'

type TaskDialogProps = {
  open: boolean
  projectId: string
  initialStatus: Task['status']
  members: TeamMember[]
  onOpenChange: (open: boolean) => void
}

export function TaskDialog({ open, projectId, initialStatus, members, onOpenChange }: TaskDialogProps) {
  const { createTask } = useTaskMutations(projectId)
  function changeOpen(value: boolean) {
    if (createTask.isPending) return
    if (!value) createTask.reset()
    onOpenChange(value)
  }

  async function submit(values: TaskFormValues) {
    try {
      await createTask.mutateAsync({ ...values, description: values.description || null, due_date: values.due_date || null, assignee_id: values.assignee_id || null })
      onOpenChange(false)
    } catch { /* Render the mutation error and keep the form values. */ }
  }

  return <Dialog open={open} onOpenChange={changeOpen} title="Uma ideia, um próximo passo" description="Divida o trabalho em pequenas conquistas. Sua equipe agradece.">
    {open && <TaskForm initialStatus={initialStatus} members={members} isPending={createTask.isPending} error={createTask.error} onSubmit={submit} onCancel={() => changeOpen(false)} />}
  </Dialog>
}
