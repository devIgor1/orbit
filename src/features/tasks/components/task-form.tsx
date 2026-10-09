import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { OptionsSelect } from '@/components/shared/options-select'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/shared/query-state'
import type { Task, TeamMember } from '@/lib/supabase/database.types'
import { taskSchema, taskStatusLabels, taskPriorityLabels, type TaskFormValues } from '../schemas/task-schema'

type TaskFormProps = {
  task?: Task
  initialStatus?: Task['status']
  members: TeamMember[]
  isPending: boolean
  error: Error | null
  onSubmit: (values: TaskFormValues) => Promise<void>
  onCancel: () => void
}

export function TaskForm({
  task,
  initialStatus = 'todo',
  members,
  isPending,
  error,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const id = useId()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      status: task?.status ?? initialStatus,
      priority: task?.priority ?? 'medium',
      assignee_id: task?.assignee_id ?? '',
      due_date: task?.due_date?.slice(0, 10) ?? '',
    },
  })

  return (
    <form className="form-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-field">
        <label className="form-label" htmlFor={`${id}-title`}>
          Nome da tarefa <span aria-hidden="true">*</span>
        </label>
        <Input
          autoFocus
          id={`${id}-title`}
          placeholder="O próximo passo para uma grande entrega"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? `${id}-title-error` : undefined}
          {...register('title')}
        />
        {errors.title && (
          <p className="form-error" id={`${id}-title-error`}>
            {errors.title.message}
          </p>
        )}
      </div>
      <div className="form-field">
        <label className="form-label" htmlFor={`${id}-description`}>
          Descrição
        </label>
        <Textarea
          id={`${id}-description`}
          placeholder="Adicione contexto, referências e detalhes…"
          rows={4}
          aria-invalid={!!errors.description}
          {...register('description')}
        />
        {errors.description && <p className="form-error">{errors.description.message}</p>}
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-status`}>
            Status
          </label>
          <Controller
            name="status"
            control={control}
            render={({ field: { onChange, ...field } }) => (
              <OptionsSelect
                {...field}
                id={`${id}-status`}
                disabled={isPending}
                onValueChange={onChange}
                aria-invalid={!!errors.status}
                items={Object.entries(taskStatusLabels).map(([value, label]) => ({ value, label }))}
              />
            )}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-priority`}>
            Prioridade
          </label>
          <Controller
            name="priority"
            control={control}
            render={({ field: { onChange, ...field } }) => (
              <OptionsSelect
                {...field}
                id={`${id}-priority`}
                disabled={isPending}
                onValueChange={onChange}
                aria-invalid={!!errors.priority}
                items={Object.entries(taskPriorityLabels).map(([value, label]) => ({ value, label }))}
              />
            )}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-assignee`}>
            Responsável
          </label>
          <Controller
            name="assignee_id"
            control={control}
            render={({ field: { onChange, ...field } }) => (
              <OptionsSelect
                {...field}
                id={`${id}-assignee`}
                disabled={isPending}
                onValueChange={onChange}
                aria-invalid={!!errors.assignee_id}
                items={[
                  { value: '', label: 'Sem responsável' },
                  ...members.filter((member) => member.is_active || member.id === task?.assignee_id).map((member) => ({
                    value: member.id, label: member.is_active ? member.full_name : `${member.full_name} (fora da equipe)`, disabled: !member.is_active,
                  })),
                ]}
              />
            )}
          />
        </div>
        <div className="form-field">
          <label className="form-label" htmlFor={`${id}-due`}>
            Data de entrega
          </label>
          <Controller
            name="due_date"
            control={control}
            render={({ field }) => (
              <DatePicker
                {...field}
                id={`${id}-due`}
                disabled={isPending}
                aria-invalid={!!errors.due_date}
                aria-describedby={errors.due_date ? `${id}-due-error` : undefined}
              />
            )}
          />
          {errors.due_date && (
            <p className="form-error" id={`${id}-due-error`}>
              {errors.due_date.message}
            </p>
          )}
        </div>
      </div>
      {error && <ErrorState error={error} />}
      <div className="form-actions">
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando…' : task ? 'Salvar alterações' : 'Criar tarefa'}
        </Button>
      </div>
    </form>
  )
}
