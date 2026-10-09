import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { signupDestination } from '../redirect-path'
import { registrationEmailSchema } from '../schemas/signup-schema'

const statusSchema = z.enum(['available', 'registered', 'confirmation_pending'])

export async function checkRegistrationEmail(email: string, signal?: AbortSignal) {
  let query = getSupabase().rpc('check_registration_email', { candidate_email: registrationEmailSchema.parse(email) })
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error?.code === 'PT429') throw new AppError('network', 'Muitas verificações. Aguarde um minuto e tente novamente.')
  if (error) throw toAppError(error)
  const result = statusSchema.safeParse(data)
  if (!result.success) throw new AppError('contract', 'O servidor não confirmou a disponibilidade deste e-mail.')
  return result.data
}

export async function resendRegistrationConfirmation(email: string, destination: string) {
  const redirect = new URL('/auth/confirm', window.location.origin)
  redirect.searchParams.set('next', signupDestination(destination))
  const { error } = await getSupabase().auth.resend({
    type: 'signup', email: registrationEmailSchema.parse(email), options: { emailRedirectTo: redirect.toString() },
  })
  if (error?.status === 429) throw new AppError('network', 'Aguarde um minuto antes de pedir outro e-mail de confirmação.')
  if (error) throw toAppError(error)
}
