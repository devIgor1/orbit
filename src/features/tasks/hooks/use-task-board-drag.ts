import { useRef, useState, type DragEvent } from 'react'
import type { Task } from '@/lib/supabase/database.types'

export const taskDragType = 'application/x-orbit-task'

export function useTaskBoardDrag(
  tasks: Task[],
  isPending: boolean,
  onStatusChange: (task: Task, status: Task['status']) => void,
) {
  const activeId = useRef<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [targetStatus, setTargetStatus] = useState<Task['status'] | null>(null)

  function end() {
    activeId.current = null
    setDraggedId(null)
    setTargetStatus(null)
  }
  function start(id: string) {
    activeId.current = id
    setDraggedId(id)
  }
  function accepts(event: DragEvent<HTMLElement>, status: Task['status']) {
    return (
      !isPending &&
      event.dataTransfer.types.includes(taskDragType) &&
      tasks.some((task) => task.id === activeId.current && task.status !== status)
    )
  }
  function over(event: DragEvent<HTMLElement>, status: Task['status']) {
    if (!accepts(event, status)) {
      event.dataTransfer.dropEffect = 'none'
      setTargetStatus(null)
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setTargetStatus(status)
  }
  function leave(event: DragEvent<HTMLElement>) {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setTargetStatus(null)
  }
  function drop(event: DragEvent<HTMLElement>, status: Task['status']) {
    event.preventDefault()
    const task =
      accepts(event, status) && event.dataTransfer.getData(taskDragType) === activeId.current
        ? tasks.find((item) => item.id === activeId.current)
        : undefined
    end()
    if (task) onStatusChange(task, status)
  }
  return { draggedId, targetStatus, start, end, over, leave, drop }
}
