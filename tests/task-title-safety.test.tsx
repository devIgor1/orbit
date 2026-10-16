import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TaskBoard } from '@/features/tasks/components/task-board'
import { TaskList } from '@/features/tasks/components/task-list'
import { TaskSheet } from '@/features/tasks/components/task-sheet'
import { NotificationItem } from '@/features/notifications/components/notification-item'
import type { Task } from '@/lib/supabase/database.types'
import { notification } from './fixtures/notifications'
import { htmlTaskTitle } from './fixtures/task-html'

// Isolate read-only presentation from backend I/O; render the real task components.
vi.mock('@/features/tasks/hooks/use-tasks', () => ({
  useTaskMutations: () => ({ updateTask: { isPending: false, error: null } }),
  useTaskComments: () => ({ data: [], isPending: false, isError: false }),
  useTaskHistory: () => ({ data: [], isPending: false, isError: false }),
  useAddComment: () => ({ isPending: false, error: null }),
}))

const task: Task = {
  id: notification.task_id, workspace_id: notification.workspace_id, project_id: notification.project_id,
  title: htmlTaskTitle, description: htmlTaskTitle, status: 'todo', priority: 'medium',
  assignee_id: null, due_date: null, completed_at: null,
  created_by: notification.recipient_id, created_at: notification.created_at, updated_at: notification.created_at,
  deleted_at: null, deleted_by: null,
}
function expectLiteralTitle(root: HTMLElement) {
  expect(within(root).getByRole('button', { name: htmlTaskTitle })).toHaveTextContent(htmlTaskTitle)
  expect(root.querySelector('b, img[src="x"], script, [onerror]')).toBeNull()
}

describe('Untrusted task titles remain text', () => {
  it('renders the board title and description without creating HTML elements', () => {
    const { container } = render(<TaskBoard tasks={[task]} members={[]} isPending={false}
      onOpen={vi.fn()} onCreate={vi.fn()} onStatusChange={vi.fn()} />)
    expectLiteralTitle(container)
    expect(container.querySelector('.task-card-description')).toHaveTextContent(htmlTaskTitle)
  })
  it('renders list results without interpreting title markup', () => {
    const { container } = render(<TaskList tasks={[task]} members={[]} isPending={false}
      onOpen={vi.fn()} onStatusChange={vi.fn()} />)
    expectLiteralTitle(container)
  })
  it('preserves literal text in the detail heading and editable fields', () => {
    render(<TaskSheet task={task} members={[]} onClose={vi.fn()} />)
    const detail = screen.getByRole('dialog', { name: htmlTaskTitle })
    expect(within(detail).getByRole('heading', { name: htmlTaskTitle })).toHaveTextContent(htmlTaskTitle)
    expect(within(detail).getByLabelText(/Nome da tarefa/)).toHaveValue(htmlTaskTitle)
    expect(within(detail).getByLabelText('Descrição')).toHaveValue(htmlTaskTitle)
    expect(detail.querySelector('b, img[src="x"], script, [onerror]')).toBeNull()
  })
  it('escapes the task title in notifications', () => {
    const { container } = render(<ul><NotificationItem item={{ ...notification, task_title: htmlTaskTitle }}
      pending={false} onOpen={vi.fn()} onRead={vi.fn()} /></ul>)
    expectLiteralTitle(container)
  })
})
