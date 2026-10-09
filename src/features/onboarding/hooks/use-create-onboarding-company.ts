import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import { createCompany } from '@/features/companies/services/company-service'

export function useCreateOnboardingCompany() {
  const { user } = useAuth()
  const cache = useQueryClient()
  return useMutation({
    mutationKey: ['onboarding-company', user?.id],
    mutationFn: createCompany,
    onSuccess: async () => {
      // The server creates the membership and selects the company atomically.
      // Read that persisted workspace before showing the team step.
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['workspace', user?.id] }),
        cache.invalidateQueries({ queryKey: ['companies', user?.id] }),
      ])
    },
  })
}
