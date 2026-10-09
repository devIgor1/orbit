import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import { createCompany, fetchCompanies, selectCompany } from '../services/company-service'
import { acceptInvitation, fetchMyInvitations } from '../services/invitation-service'

export function useCompanies() {
  const { user, configured } = useAuth()
  return useQuery({ queryKey: ['companies', user?.id], queryFn: fetchCompanies, enabled: configured && !!user })
}

export function useMyInvitations() {
  const { user, configured } = useAuth()
  return useQuery({
    queryKey: ['my-invitations', user?.id],
    queryFn: fetchMyInvitations,
    enabled: configured && !!user,
  })
}

type CompanyAction =
  { action: 'create'; name: string } | { action: 'select'; id: string } | { action: 'accept'; id: string }

export function useCompanyAccess() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompanyAction) => {
      if (input.action === 'create') return (await createCompany(input.name)).id
      if (input.action === 'accept') return acceptInvitation(input.id)
      return selectCompany(input.id)
    },
    onSuccess: async () => {
      // The selected company is persisted by the backend. Discard all previous
      // workspace queries before the protected shell is mounted again.
      await cache.cancelQueries()
      cache.removeQueries({
        predicate: (query) => !['companies', 'my-invitations'].includes(String(query.queryKey[0])),
      })
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['companies'] }),
        cache.invalidateQueries({ queryKey: ['my-invitations'] }),
      ])
    },
  })
}
