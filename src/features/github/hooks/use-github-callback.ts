import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import { AppError } from '@/lib/errors/app-error'
import { completeGithubConnection } from '../services/github-service'

export function useGithubCallback() {
  const { user } = useAuth()
  const cache = useQueryClient()
  const location = useLocation()
  // The workspace shell may remount this page after loading its scope. Router
  // location retains the callback even after we remove credentials from the bar.
  const [parameters] = useState(() => new URLSearchParams(location.search))
  const state = parameters.get('state')
  const code = parameters.get('code')
  useEffect(() => {
    window.history.replaceState(window.history.state, '', window.location.pathname)
  }, [])
  return useQuery({
    queryKey: ['github-callback', user?.id, state],
    enabled: Boolean(user),
    retry: false,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!state || !code || parameters.has('error'))
        throw new AppError('contract', 'A autorização não foi concluída. Volte às configurações e conecte novamente.')
      const result = await completeGithubConnection(state, code)
      await cache.invalidateQueries({ queryKey: ['github', user?.id] })
      return result
    },
  })
}
