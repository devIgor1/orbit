import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Task, TeamMember } from '@/lib/supabase/database.types'
import { taskStatuses, taskStatusLabels } from '../schemas/task-schema'
import { TaskCard } from './task-card'
import { useTaskBoardDrag } from '../hooks/use-task-board-drag'

type TaskBoardProps = {
  tasks: Task[]
  members: TeamMember[]
  isPending: boolean
  onOpen: (task: Task) => void
  onCreate: (status: Task['status']) => void
  onStatusChange: (task: Task, status: Task['status']) => void
}

export function TaskBoard({ tasks, members, isPending, onOpen, onCreate, onStatusChange }: TaskBoardProps) {
  const drag = useTaskBoardDrag(tasks, isPending, onStatusChange)
  return (
    <div className="task-board">
      {taskStatuses.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status)
        return (
          <section
            className="task-column"
            data-status={status}
            key={status}
            aria-label={taskStatusLabels[status]}
            data-drop-target={drag.targetStatus === status || undefined}
            onDragOver={(event) => drag.over(event, status)}
            onDragLeave={drag.leave}
            onDrop={(event) => drag.drop(event, status)}
          >
            <header className="task-column-header">
              <h3 className="task-column-title">
                <span className="status-dot" />
                {taskStatusLabels[status]}
                <span className="task-column-count">{columnTasks.length}</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Criar tarefa em ${taskStatusLabels[status]}`}
                onClick={() => onCreate(status)}
              >
                <Plus aria-hidden="true" />
              </Button>
            </header>
            <div className="task-column-content">
              {columnTasks.map((task) => {
                const member = members.find((item) => item.id === task.assignee_id)
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    assignee={member ? { name: member.full_name, avatar_url: member.avatar_url } : undefined}
                    disabled={isPending}
                    isDragging={drag.draggedId === task.id}
                    onDragStart={() => drag.start(task.id)}
                    onDragEnd={drag.end}
                    onOpen={() => onOpen(task)}
                    onStatusChange={(next) => onStatusChange(task, next)}
                  />
                )
              })}
              {columnTasks.length === 0 && <p className="task-column-empty">Nenhuma tarefa nesta etapa.</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}
