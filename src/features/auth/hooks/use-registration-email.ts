import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '../use-auth'
import { checkRegistrationEmail, resendRegistrationConfirmation } from '../services/registration-email-service'
import { registrationEmailSchema } from '../schemas/signup-schema'

export function useRegistrationEmail(value: string) {
  const { configured, user } = useAuth()
  const parsed = registrationEmailSchema.safeParse(value)
  const email = parsed.success ? parsed.data : ''
  const [settledEmail, setSettledEmail] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledEmail(email), 500)
    return () => window.clearTimeout(timer)
  }, [email])
  const query = useQuery({
    queryKey: ['registration-email', user?.id, email],
    queryFn: ({ signal }) => checkRegistrationEmail(email, signal),
    enabled: configured && Boolean(email) && email === settledEmail,
    retry: false, staleTime: 0, gcTime: 0, refetchOnWindowFocus: false,
  })
  const checking = configured && Boolean(email) && (email !== settledEmail || query.isPending || query.isFetching)
  return { ...query, email, checking, blocked: checking || query.data === 'registered' || query.data === 'confirmation_pending' }
}

export function useResendRegistration(email: string, destination: string) {
  return useMutation({ mutationFn: () => resendRegistrationConfirmation(email, destination) })
}
