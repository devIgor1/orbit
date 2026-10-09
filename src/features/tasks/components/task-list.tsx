import { Avatar } from '@/components/ui/avatar'
import { Select } from '@/components/ui/select'
import { DataTable } from '@/components/shared/data-table'
import { formatDate } from '@/lib/format'
import type { Task, TeamMember } from '@/lib/supabase/database.types'
import { taskStatusLabels, taskStatuses } from '../schemas/task-schema'
import { TaskPriority } from './task-priority'

type TaskListProps = {
  tasks: Task[]
  members: TeamMember[]
  isPending: boolean
  onOpen: (task: Task) => void
  onStatusChange: (task: Task, status: Task['status']) => void
}

export function TaskList({ tasks, members, isPending, onOpen, onStatusChange }: TaskListProps) {
  return <DataTable rows={tasks} getRowId={task => task.id} columns={[
    { id: 'title', header: 'Tarefa', cell: task => <button type="button" className="task-row-title" onClick={() => onOpen(task)}>{task.title}</button> },
    { id: 'status', header: 'Status', cell: task => <Select aria-label={`Status de ${task.title}`} value={task.status} disabled={isPending} onChange={event => {
      const status = taskStatuses.find(value => value === event.target.value)
      if (status) onStatusChange(task, status)
    }}>{taskStatuses.map(status => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}</Select> },
    { id: 'priority', header: 'Prioridade', cell: task => <TaskPriority priority={task.priority} /> },
    { id: 'assignee', header: 'Responsável', cell: task => {
      const member = members.find(item => item.id === task.assignee_id)
      return member ? <span className="member-inline"><Avatar name={member.full_name} src={member.avatar_url ?? undefined} /><span>{member.full_name}</span></span> : <span className="muted-text">Sem responsável</span>
    } },
    { id: 'due_date', header: 'Entrega', cell: task => formatDate(task.due_date) },
  ]} />
}
