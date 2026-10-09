import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Dialog } from '@/components/ui/dialog'
import { Sheet } from '@/components/ui/sheet'
import { ProjectForm } from '@/features/projects/components/project-form'
import { TaskForm } from '@/features/tasks/components/task-form'
import '@/styles/globals.css'

// Test-only entry point: real forms/overlays with fixtures, without backend calls.
function DatePickerFixture() {
  const [open, setOpen] = useState(true)
  const [submitted, setSubmitted] = useState<{ due_date: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const isTask = new URLSearchParams(location.search).get('kind') === 'task'
  const Container = isTask ? Sheet : Dialog
  const props = {
    isPending: false,
    error: failed ? new Error('Falha simulada no envio') : null,
    onCancel: () => setOpen(false),
    onSubmit: async (values: { due_date: string }) => {
      if (new URLSearchParams(location.search).has('failure')) setFailed(true)
      else setSubmitted(values)
    },
  }
  return (
    <main className="app-shell">
      <Container open={open} onOpenChange={setOpen} title="Teste do formulário">
        {isTask ? (
          <TaskForm
            {...props}
            members={[
              {
                id: 'member-test',
                full_name: 'Pessoa de teste com nome longo para verificar o espaço disponível',
                avatar_url: null,
                job_title: null,
                role: 'member',
                assigned_tasks: 0,
                completed_tasks: 0,
              },
            ]}
          />
        ) : (
          <ProjectForm {...props} />
        )}
        {submitted !== null && (
          <>
            <output aria-label="Data enviada">{submitted.due_date || 'Sem data'}</output>
            <output aria-label="Valores enviados">{JSON.stringify(submitted)}</output>
          </>
        )}
      </Container>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<DatePickerFixture />)
