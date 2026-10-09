import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { companySchema, type CompanyValues } from '../schemas/company-schema'

export function CompanyForm({ busy, onCreate }: { busy: boolean; onCreate: (name: string) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CompanyValues>({ resolver: zodResolver(companySchema), defaultValues: { name: '' } })
  return (
    <form className="company-form" noValidate onSubmit={handleSubmit((values) => onCreate(values.name))}>
      <div className="form-field">
        <label htmlFor="company-name">Nome da empresa</label>
        <Input
          id="company-name"
          placeholder="Como sua equipe se chama?"
          autoComplete="organization"
          disabled={busy || isSubmitting}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'company-name-error' : undefined}
          {...register('name')}
        />
        {errors.name && (
          <p className="field-error" id="company-name-error">
            {errors.name.message}
          </p>
        )}
      </div>
      <p className="field-help">
        Você será o administrador e poderá convidar colaboradores para os projetos e o Kanban.
      </p>
      <Button type="submit" disabled={busy || isSubmitting}>
        <Building2 />
        {busy ? 'Aguarde…' : 'Cadastrar empresa'}
      </Button>
    </form>
  )
}
