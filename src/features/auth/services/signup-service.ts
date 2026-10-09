import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import type { SignupValues } from '../schemas/signup-schema'
import { safeDestination } from '../redirect-path'

export async function signUp(values: SignupValues, destination: string) {
  const redirect = new URL('/login', window.location.origin)
  redirect.searchParams.set('next', safeDestination(destination, '/companies'))
  const { data, error } = await getSupabase().auth.signUp({
    email: values.email,
    password: values.password,
    options: { data: { full_name: values.fullName }, emailRedirectTo: redirect.toString() },
  })
  if (error) {
    if (error.code === 'email_address_not_authorized' || error.code === 'email_address_not_allowed')
      throw new AppError(
        'configuration',
        'O envio de e-mails de confirmação ainda não está disponível para este endereço. Entre em contato com o administrador da plataforma.',
      )
    if (error.code === 'user_already_exists')
      throw new AppError('contract', 'Já existe uma conta com este e-mail. Entre para continuar.')
    if (error.code === 'weak_password')
      throw new AppError('contract', 'Escolha uma senha mais forte, com letras, números e símbolos.')
    if (error.status === 429)
      throw new AppError('network', 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
    throw toAppError(error)
  }
  if (!data.user) throw new AppError('contract', 'O servidor não confirmou o cadastro. Tente novamente.')
  return { confirmationRequired: !data.session }
}
