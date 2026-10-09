import { Dialog } from '@/components/ui/dialog'
import type { Project } from '@/lib/supabase/database.types'
import { useProjectMutations } from '../hooks/use-projects'
import { ProjectForm } from './project-form'
import type { ProjectFormValues } from '../schemas/project-schema'

type ProjectDialogProps = { open: boolean; onOpenChange: (open: boolean) => void; project?: Project }

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { createProject, updateProject } = useProjectMutations()
  const mutation = project ? updateProject : createProject
  function changeOpen(value: boolean) {
    if (mutation.isPending) return
    if (!value) mutation.reset()
    onOpenChange(value)
  }

  async function submit(values: ProjectFormValues) {
    const payload = { ...values, description: values.description || null, due_date: values.due_date || null }
    try {
      if (project) await updateProject.mutateAsync({ id: project.id, ...payload })
      else await createProject.mutateAsync(payload)
      onOpenChange(false)
    } catch { /* The mutation error is rendered below; preserve entered values. */ }
  }

  return <Dialog open={open} onOpenChange={changeOpen} title={project ? 'Editar projeto' : 'Vamos criar algo incrível'} description={project ? 'Atualize as informações e mantenha sua equipe alinhada.' : 'Dê um nome à sua próxima grande ideia. Os detalhes podem vir depois.'}>
    {open && <ProjectForm project={project} isPending={mutation.isPending} error={mutation.error} onSubmit={submit} onCancel={() => changeOpen(false)} />}
  </Dialog>
}
