import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/use-auth'
import { AppError } from '@/lib/errors/app-error'
import { authorizeGithubConnection, completeGithubConnection } from '../services/github-service'

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
  const connection = useQuery({
    queryKey: ['github-callback', user?.id, state, code ? 'oauth' : 'installation'],
    enabled: Boolean(user),
    retry: false,
    staleTime: Infinity,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (parameters.get('setup_action') === 'request')
        throw new AppError(
          'permission',
          'O pedido foi enviado à administração da organização no GitHub. Após a aprovação, volte às configurações e conecte novamente.',
        )
      if (!state || parameters.has('error'))
        throw new AppError('contract', 'A autorização não foi concluída. Volte às configurações e conecte novamente.')
      if (!code) {
        const installation = parameters.get('installation_id')
        const installationId = Number(installation)
        if (
          !installation ||
          !/^\d+$/.test(installation) ||
          !Number.isSafeInteger(installationId) ||
          installationId <= 0 ||
          !['install', 'update'].includes(parameters.get('setup_action') ?? '')
        )
          throw new AppError('contract', 'Inicie a conexão pelo botão Conectar GitHub nas configurações do Orbit.')
        return { status: 'redirect' as const, ...(await authorizeGithubConnection(state, installationId)) }
      }
      const result = await completeGithubConnection(state, code)
      await cache.invalidateQueries({ queryKey: ['github', user?.id] })
      return { status: 'connected' as const, ...result }
    },
  })
  const redirectUrl = connection.isSuccess && connection.data.status === 'redirect' ? connection.data.url : null
  useEffect(() => {
    if (redirectUrl) window.location.assign(redirectUrl)
  }, [redirectUrl])
  return connection
}
