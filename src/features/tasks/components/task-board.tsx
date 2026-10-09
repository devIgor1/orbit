import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Task, TeamMember } from '@/lib/supabase/database.types'
import { taskStatuses, taskStatusLabels } from '../schemas/task-schema'
import { TaskCard } from './task-card'

type TaskBoardProps = {
  tasks: Task[]
  members: TeamMember[]
  isPending: boolean
  onOpen: (task: Task) => void
  onCreate: (status: Task['status']) => void
  onStatusChange: (task: Task, status: Task['status']) => void
}

export function TaskBoard({ tasks, members, isPending, onOpen, onCreate, onStatusChange }: TaskBoardProps) {
  return (
    <div className="task-board">
      {taskStatuses.map(status => {
        const columnTasks = tasks.filter(task => task.status === status)
        return (
          <section className="task-column" data-status={status} key={status} aria-label={taskStatusLabels[status]}
            onDragOver={event => { if (!isPending) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } }}
            onDrop={event => {
              event.preventDefault()
              if (isPending) return
              const task = tasks.find(item => item.id === event.dataTransfer.getData('text/plain'))
              if (task && task.status !== status) onStatusChange(task, status)
            }}>
            <header className="task-column-header">
              <h3 className="task-column-title"><span className="status-dot" />{taskStatusLabels[status]}<span className="task-column-count">{columnTasks.length}</span></h3>
              <Button variant="ghost" size="icon" aria-label={`Criar tarefa em ${taskStatusLabels[status]}`} onClick={() => onCreate(status)}><Plus aria-hidden="true" /></Button>
            </header>
            <div className="task-column-content">
              {columnTasks.map(task => {
                const member = members.find(item => item.id === task.assignee_id)
                return <TaskCard key={task.id} task={task} assignee={member ? { name: member.full_name, avatar_url: member.avatar_url } : undefined} disabled={isPending} onOpen={() => onOpen(task)} onStatusChange={next => onStatusChange(task, next)} />
              })}
              {columnTasks.length === 0 && <p className="task-column-empty">Nenhuma tarefa nesta etapa.</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
