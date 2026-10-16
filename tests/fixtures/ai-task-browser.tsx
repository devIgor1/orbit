import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '@/components/ui/button'
import { AiTaskDialog } from '@/features/ai-tasks/components/ai-task-dialog'
import { createTestClient, testAuth, testWorkspace, TestProviders } from '../test-providers'
import { aiRequest, aiUserId } from './ai-task'
import '@/styles/globals.css'

// Browser-only test fixture; Playwright intercepts the Edge Function.
const client = createTestClient()
client.setQueryDefaults(['workspace'], { staleTime: Infinity })
client.setQueryData(['workspace', aiUserId], {
  ...testWorkspace, workspace: { ...testWorkspace.workspace, id: aiRequest.workspaceId },
})
const auth = { ...testAuth, user: { ...testAuth.user!, id: aiUserId } }
function Fixture() {
  const [open, setOpen] = useState(false)
  const [taskId, setTaskId] = useState('')
  return <TestProviders client={client} auth={auth}><main className="page-content">
    <Button onClick={() => setOpen(true)}>Criar com IA</Button>
    <p>{taskId ? `Tarefa aberta: ${taskId}` : ''}</p>
    <AiTaskDialog open={open} projectId={aiRequest.projectId}
      projectTitle="Loja com um nome de projeto muito longo para conferir o layout"
      onOpenChange={setOpen} onOpenTask={setTaskId} />
  </main></TestProviders>
}
createRoot(document.getElementById('root')!).render(<Fixture />)
