import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/shared/query-state'
import { companySchema, type CompanyValues } from '../schemas/company-schema'
import { hasFormChanges } from '@/lib/forms/has-form-changes'

type Props = {
  name: string
  isPending: boolean
  error: unknown
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

export function CompanyRenameForm({ name, isPending, error, onSubmit, onCancel }: Props) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
    defaultValues: { name },
    values: { name },
    resetOptions: { keepDirtyValues: true },
  })
  const hasChanges = hasFormChanges(useWatch({ control }), { name })
  const canSubmit = !isPending && hasChanges
  return (
    <form className="form-stack" noValidate onSubmit={handleSubmit(values => { if (canSubmit) return onSubmit(values.name) })}>
      <div className="form-field">
        <label htmlFor="company-rename">Nome da empresa</label>
        <Input
          id="company-rename"
          autoComplete="organization"
          autoFocus
          disabled={isPending}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'company-rename-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p className="field-error" id="company-rename-error">
            {errors.name.message}
          </p>
        )}
      </div>
      {Boolean(error) && <ErrorState error={error} />}
      <div className="form-actions">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isPending ? 'Salvando…' : 'Salvar nome'}
        </Button>
      </div>
    </form>
  )
}
