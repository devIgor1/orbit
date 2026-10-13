import { createRoot } from 'react-dom/client'
import { Sheet } from '@/components/ui/sheet'
import { TaskGithub } from '@/features/github/components/task-github'
import type { Task } from '@/lib/supabase/database.types'
import { createTestClient, testWorkspace, TestProviders } from '../test-providers'
import '@/styles/globals.css'

// Isolated browser fixture. Playwright intercepts every request; no real login or writes.
const task: Task = {
  id: 'ad000000-0000-4000-8000-000000000030',
  workspace_id: 'a0b17000-0000-4000-8000-000000000001',
  project_id: 'b0b17000-0000-4000-8000-000000000001',
  title: 'Vincular a entrega da tarefa ao pull request',
  description: null,
  status: 'todo',
  priority: 'medium',
  assignee_id: null,
  due_date: null,
  completed_at: null,
  created_by: 'user-1',
  created_at: '2026-10-13T12:00:00Z',
  updated_at: '2026-10-13T12:00:00Z',
}
const client = createTestClient()
client.setQueryDefaults(['workspace'], { staleTime: Infinity })
client.setQueryData(['workspace', 'user-1'], {
  ...testWorkspace,
  workspace: { ...testWorkspace.workspace, id: task.workspace_id },
})
createRoot(document.getElementById('root')!).render(
  <TestProviders client={client}>
    <Sheet open title={task.title} description="Desenvolvimento da tarefa">
      <TaskGithub task={task} />
    </Sheet>
  </TestProviders>,
)
