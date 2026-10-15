import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import {
  createCompany,
  deleteCompany,
  fetchCompanies,
  fetchDeletedCompanies,
  renameCompany,
  restoreCompany,
  selectCompany,
} from '../services/company-service'
import { acceptInvitation, fetchMyInvitations } from '../services/invitation-service'
import { useInvitationRealtime } from './use-invitation-realtime'

export function useCompanies() {
  const { user, configured } = useAuth()
  return useQuery({ queryKey: ['companies', user?.id], queryFn: fetchCompanies, enabled: configured && !!user })
}

export function useMyInvitations() {
  const { user, configured } = useAuth()
  const live = useInvitationRealtime(configured ? user?.id : undefined)
  const query = useQuery({
    queryKey: ['my-invitations', user?.id],
    queryFn: fetchMyInvitations,
    enabled: configured && !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: 'always',
  })
  return { ...query, ...live }
}

type CompanyAction =
  | { action: 'create'; name: string }
  | { action: 'select'; id: string }
  | { action: 'accept'; id: string }
  | { action: 'restore'; id: string }

export function useCompanyAccess() {
  const cache = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompanyAction) => {
      if (input.action === 'create') return (await createCompany(input.name)).id
      if (input.action === 'accept') return acceptInvitation(input.id)
      if (input.action === 'restore') return restoreCompany(input.id)
      return selectCompany(input.id)
    },
    onSuccess: async () => {
      // The selected company is persisted by the backend. Discard all previous
      // workspace queries before the protected shell is mounted again.
      await cache.cancelQueries()
      cache.removeQueries({
        predicate: (query) => !['companies', 'deleted-companies', 'my-invitations'].includes(String(query.queryKey[0])),
      })
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['companies'] }),
        cache.invalidateQueries({ queryKey: ['deleted-companies'] }),
        cache.invalidateQueries({ queryKey: ['my-invitations'] }),
      ])
    },
  })
}

/** Companies in the trash that the user administers and can still restore. */
export function useDeletedCompanies() {
  const { user, configured } = useAuth()
  return useQuery({
    queryKey: ['deleted-companies', user?.id],
    queryFn: fetchDeletedCompanies,
    enabled: configured && !!user,
  })
}

export function useCompanyAdministration(workspaceId: string) {
  const cache = useQueryClient()
  const rename = useMutation({
    mutationFn: (name: string) => renameCompany(workspaceId, name),
    onSuccess: () => Promise.all(['workspace', 'companies'].map((key) => cache.invalidateQueries({ queryKey: [key] }))),
  })
  const remove = useMutation({
    mutationFn: (confirmation: string) => deleteCompany(workspaceId, confirmation),
    onSuccess: async () => {
      // Every view of the deleted company is discarded; the shell then picks another company.
      await cache.cancelQueries()
      cache.removeQueries({
        predicate: (query) => !['workspace', 'companies', 'deleted-companies'].includes(String(query.queryKey[0])),
      })
      await Promise.all(
        ['workspace', 'companies', 'deleted-companies'].map((key) => cache.invalidateQueries({ queryKey: [key] })),
      )
    },
  })
  return { rename, remove }
}
