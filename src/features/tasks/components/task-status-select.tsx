import { OptionsSelect } from '@/components/shared/options-select'
import type { Task } from '@/lib/supabase/database.types'
import { taskStatusLabels, taskStatuses } from '../schemas/task-schema'

type TaskStatusSelectProps = {
  task: Pick<Task, 'title' | 'status'>
  disabled: boolean
  onValueChange: (status: Task['status']) => void
  className?: string
}

export function TaskStatusSelect({ task, disabled, onValueChange, className }: TaskStatusSelectProps) {
  return (
    <OptionsSelect
      className={className}
      aria-label={`Status de ${task.title}`}
      value={task.status}
      disabled={disabled}
      onValueChange={onValueChange}
      items={taskStatuses.map((value) => ({ value, label: taskStatusLabels[value] }))}
    />
  )
}
