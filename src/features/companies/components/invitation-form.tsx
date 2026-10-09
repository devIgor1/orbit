import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { invitationSchema, type InvitationValues } from '../schemas/company-schema'

interface InvitationFormProps {
  busy: boolean
  onInvite: (email: string, sendEmail: boolean) => Promise<void>
}

export function InvitationForm({ busy, onInvite }: InvitationFormProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InvitationValues>({
    resolver: zodResolver(invitationSchema), defaultValues: { email: '' },
  })
  const disabled = busy || isSubmitting
  const submit = (sendEmail: boolean) => handleSubmit(async ({ email }) => {
    try {
      await onInvite(email, sendEmail)
      reset()
    } catch {
      // The parent renders the mutation error; preserve the typed address.
    }
  })
  return (
    <form className="company-form" noValidate onSubmit={submit(true)}>
      <div className="form-field">
        <label htmlFor="invitation-email">E-mail do colaborador</label>
        <Input id="invitation-email" type="email" autoComplete="off" disabled={disabled}
          aria-invalid={!!errors.email} aria-describedby={errors.email ? 'invitation-email-error' : 'invitation-help'}
          {...register('email')} />
        {errors.email && <p id="invitation-email-error" className="field-error">{errors.email.message}</p>}
      </div>
      <p id="invitation-help" className="field-help">
        Enviaremos um convite em seu nome, com o link para entrar na empresa. As respostas vão para o seu e-mail.
        O convite vale por 7 dias e só pode ser aceito pela conta com o endereço informado.
      </p>
      <div className="invitation-actions">
        <Button type="submit" disabled={disabled}><Mail />{disabled ? 'Aguarde…' : 'Enviar convite'}</Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => void submit(false)()}>
          <Link /> Gerar só o link
        </Button>
      </div>
    </form>
  )
}
