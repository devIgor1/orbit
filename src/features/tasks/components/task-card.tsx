import { CalendarDays, GripVertical } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/format'
import type { Task } from '@/lib/supabase/database.types'
import { TaskStatusSelect } from './task-status-select'
import { TaskPriority } from './task-priority'

type TaskCardProps = {
  task: Task
  assignee?: { name: string; avatar_url: string | null }
  disabled: boolean
  onOpen: () => void
  onStatusChange: (status: Task['status']) => void
}

export function TaskCard({ task, assignee, disabled, onOpen, onStatusChange }: TaskCardProps) {
  return (
    <article
      className="task-card"
      draggable={!disabled}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', task.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div className="task-card-top">
        <TaskPriority priority={task.priority} />
        <GripVertical className="task-drag-handle" aria-hidden="true" />
      </div>
      <button className="task-card-title" type="button" onClick={onOpen}>
        {task.title}
      </button>
      {task.description && <p className="task-card-description">{task.description}</p>}
      <div className="task-card-footer">
        <span className="task-date">
          <CalendarDays aria-hidden="true" />
          {formatDate(task.due_date)}
        </span>
        {assignee ? (
          <Avatar name={assignee.name} src={assignee.avatar_url ?? undefined} />
        ) : (
          <span className="task-unassigned">Sem responsável</span>
        )}
      </div>
      <TaskStatusSelect className="task-status-select" task={task} disabled={disabled} onValueChange={onStatusChange} />
    </article>
  )
}
