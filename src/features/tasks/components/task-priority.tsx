import { Flag } from 'lucide-react'
import type { Task } from '@/lib/supabase/database.types'
import { taskPriorityLabels } from '../schemas/task-schema'

export function TaskPriority({ priority }: { priority: Task['priority'] }) {
  return <span className="task-priority" data-priority={priority}><Flag aria-hidden="true" />{taskPriorityLabels[priority]}</span>
}
