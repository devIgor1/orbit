import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import type { SignupValues } from '../schemas/signup-schema'
import { signupDestination } from '../redirect-path'
import { passwordPolicyMessage } from '../schemas/password-policy'

export async function signUp(values: SignupValues, destination: string) {
  const redirect = new URL('/auth/confirm', window.location.origin)
  redirect.searchParams.set('next', signupDestination(destination))
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
    if (error.code === 'user_already_exists' || error.code === 'email_exists')
      throw new AppError('contract', 'Já existe uma conta com este e-mail. Entre para continuar.')
    if (error.code === 'weak_password') throw new AppError('contract', passwordPolicyMessage)
    if (error.status === 429)
      throw new AppError('network', 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
    throw toAppError(error)
  }
  if (!data.user) throw new AppError('contract', 'O servidor não confirmou o cadastro. Tente novamente.')
  // Auth can conceal a repeated signup behind HTTP 200 and a user without identities.
  if (!data.session && data.user.identities?.length === 0)
    throw new AppError('contract', 'Já existe uma conta com este e-mail. Entre para continuar.')
  if (!data.session && !data.user.identities)
    throw new AppError('contract', 'O servidor não confirmou o cadastro. Tente novamente.')
  return { confirmationRequired: !data.session }
}
