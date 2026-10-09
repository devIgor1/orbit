import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/shared/query-state'
import { projectSchema, projectStatusLabels, type ProjectFormValues } from '../schemas/project-schema'
import type { Project } from '@/lib/supabase/database.types'

type ProjectFormProps = {
  project?: Project
  isPending: boolean
  error: Error | null
  onSubmit: (values: ProjectFormValues) => Promise<void>
  onCancel: () => void
}

export function ProjectForm({ project, isPending, error, onSubmit, onCancel }: ProjectFormProps) {
  const id = useId()
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: project?.title ?? '',
      description: project?.description ?? '',
      status: project?.status ?? 'active',
      due_date: project?.due_date?.slice(0, 10) ?? '',
    },
  })

  return (
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor={`${id}-title`}>Nome do projeto <span aria-hidden="true">*</span></label>
        <Input id={`${id}-title`} placeholder="Ex.: Identidade visual da marca" autoFocus aria-invalid={!!errors.title} aria-describedby={errors.title ? `${id}-title-error` : undefined} {...register('title')} />
        {errors.title && <p className="form-error" id={`${id}-title-error`}>{errors.title.message}</p>}
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${id}-description`}>Sobre o projeto</label>
        <Textarea id={`${id}-description`} placeholder="O que sua equipe vai criar?" rows={4} aria-invalid={!!errors.description} {...register('description')} />
        {errors.description && <p className="form-error">{errors.description.message}</p>}
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-status`}>Status</label>
          <Select id={`${id}-status`} {...register('status')}>
            {Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-date`}>Data de entrega</label>
          <Input id={`${id}-date`} type="date" {...register('due_date')} />
        </div>
      </div>
      {error && <ErrorState error={error} />}
      <div className="form-actions">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Salvando…' : project ? 'Salvar alterações' : 'Criar projeto'}</Button>
      </div>
    </form>
  )
}
