import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors/app-error'
import { useAuth } from '../use-auth'
import { useSignup } from '../hooks/use-signup'
import { signupSchema, type SignupValues } from '../schemas/signup-schema'

export function SignupForm({ destination }: { destination: string }) {
  const { configured } = useAuth()
  const signup = useSignup(destination)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })
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
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'signup-email-error' : undefined}
          {...register('email')}
        />
        {errors.email && (
          <p id="signup-email-error" className="field-error">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="form-field">
        <label htmlFor="signup-password">Senha</label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          disabled={busy}
          aria-invalid={!!errors.password}
          aria-describedby="signup-password-help"
          {...register('password')}
        />
        <p id="signup-password-help" className={errors.password ? 'field-error' : 'field-help'}>
          {errors.password?.message ?? 'Pelo menos 8 caracteres.'}
        </p>
      </div>
      <div className="form-field">
        <label htmlFor="signup-confirm">Confirmar senha</label>
        <Input
          id="signup-confirm"
          type="password"
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
      <Button type="submit" className="login-submit" disabled={busy || !configured}>
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
