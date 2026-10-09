import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { errorMessage } from '@/lib/errors/app-error'
import { useAuth } from '../use-auth'
import { useSignup } from '../hooks/use-signup'
import { signupSchema, type SignupValues } from '../schemas/signup-schema'
import { PasswordRequirements } from './password-requirements'
import { useRegistrationEmail } from '../hooks/use-registration-email'
import { RegistrationEmailFeedback } from './registration-email-feedback'

export function SignupForm({ destination }: { destination: string }) {
  const { configured } = useAuth()
  const signup = useSignup(destination)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })
  const password = useWatch({ control, name: 'password' })
  const email = useWatch({ control, name: 'email' })
  const emailCheck = useRegistrationEmail(email)
  const busy = isSubmitting || signup.isPending
  const loginUrl = `/login?next=${encodeURIComponent(destination)}`
  if (signup.isSuccess && signup.data.confirmationRequired)
    return (
      <div className="auth-confirmation" role="status">
        <MailCheck aria-hidden="true" />
        <h3>Confira seu e-mail</h3>
        <p>
          Se o endereço puder ser cadastrado, você receberá um link para confirmar sua conta. Confira também a caixa de
          spam.
        </p>
        <p>Já tem uma conta? Entre com sua senha.</p>
        <Button asChild>
          <Link to={loginUrl}>Ir para o login</Link>
        </Button>
      </div>
    )
  return (
    <form
      className="login-form"
      onSubmit={handleSubmit(async (values) => {
        if (emailCheck.blocked) return
        try {
          await signup.mutateAsync(values)
        } catch {
          /* The mutation exposes the backend error below. */
        }
      })}
      noValidate
    >
      <div className="form-field">
        <label htmlFor="signup-name">Nome completo</label>
        <Input
          id="signup-name"
          autoComplete="name"
          disabled={busy}
          aria-invalid={!!errors.fullName}
          aria-describedby={errors.fullName ? 'signup-name-error' : undefined}
          {...register('fullName')}
        />
        {errors.fullName && (
          <p id="signup-name-error" className="field-error">
            {errors.fullName.message}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="signup-email">E-mail</label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          disabled={busy}
          aria-invalid={!!errors.email || emailCheck.data === 'registered'}
          aria-describedby={`signup-email-availability${errors.email ? ' signup-email-error' : ''}`}
          {...register('email')}
        />
        {errors.email && (
          <p id="signup-email-error" className="field-error">
            {errors.email.message}
          </p>
        )}
        <RegistrationEmailFeedback check={emailCheck} destination={destination} loginUrl={loginUrl} />
      </div>
      <div className="form-field">
        <label htmlFor="signup-password">Senha</label>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          minLength={8}
          disabled={busy}
          aria-invalid={!!errors.password}
          aria-describedby={`signup-password-help${errors.password ? ' signup-password-error' : ''}`}
          {...register('password')}
        />
        <PasswordRequirements id="signup-password-help" value={password} />
        {errors.password && (
          <p id="signup-password-error" className="field-error">
            {errors.password.message}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="signup-confirm">Confirmar senha</label>
        <PasswordInput
          id="signup-confirm"
          visibilityLabel="confirmação de senha"
          autoComplete="new-password"
          disabled={busy}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p id="signup-confirm-error" className="field-error">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>
      {signup.isError && (
        <p role="alert" className="form-error">
          {errorMessage(signup.error)}
        </p>
      )}
      {!configured && (
        <p role="alert" className="form-error">
          Configure a conexão com o Supabase para criar sua conta.
        </p>
      )}
      <Button type="submit" className="login-submit" disabled={busy || !configured || emailCheck.blocked}>
        {busy ? (
          'Criando conta…'
        ) : (
          <>
            Criar minha conta <ArrowRight />
          </>
        )}
      </Button>
      <p className="login-form-footer">
        Já tem uma conta?{' '}
        <Link className="text-link" to={loginUrl}>
          Entrar
        </Link>
      </p>
    </form>
  )
}
