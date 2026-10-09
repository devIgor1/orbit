import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors/app-error'
import { useAuth } from '../use-auth'
import { loginSchema, type LoginValues } from '../schemas/login-schema'

export function LoginForm({ destination = '/companies' }: { destination?: string }) {
  const { configured, loading, signIn } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' },
  })
  const busy = loading || isSubmitting

  async function onSubmit(values: LoginValues) {
    setSubmitError(null)
    try { await signIn(values.email, values.password) }
    catch (error) { setSubmitError(errorMessage(error)) }
  }

  return <form className="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
    <div className="form-field">
      <label htmlFor="login-email">E-mail</label>
      <Input id="login-email" type="email" autoComplete="username" placeholder="voce@seuestudio.com" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} {...register('email')} />
      {errors.email && <p className="field-error" id="login-email-error">{errors.email.message}</p>}
    </div>
    <div className="form-field">
      <label htmlFor="login-password">Senha</label>
      <div className="password-field">
        <Input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} {...register('password')} />
        <Button variant="ghost" size="icon" className="password-toggle" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button>
      </div>
      {errors.password && <p className="field-error" id="login-password-error">{errors.password.message}</p>}
    </div>
    {submitError && <p role="alert" className="form-error">{submitError}</p>}
    {!configured && <p className="login-configuration">Conecte seu Supabase para entrar com uma conta real. <Link to="/settings">Configurar conexão</Link></p>}
    <Button type="submit" className="login-submit" disabled={busy || !configured}>{busy ? <><LoaderCircle className="loading-spinner" /> Entrando…</> : <>Entrar no workspace <ArrowRight /></>}</Button>
    <p className="login-form-footer">Ainda não tem conta? <Link className="text-link" to={`/signup?next=${encodeURIComponent(destination)}`}>Criar conta</Link></p>
  </form>
}
