import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { queryClient } from '@/lib/query/query-client'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<AppError | null>(null)
  const identity = useRef<string | null>(null)
  const signingOut = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const client = getSupabase()
    let active = true
    let authEventReceived = false
    let expiredSession = false
    function applyUser(next: User | null) {
      if (!active) return
      if (identity.current !== next?.id) queryClient.clear()
      identity.current = next?.id ?? null
      setUser(next)
      setLoading(false)
    }
    const { data: subscription } = client.auth.onAuthStateChange((event, session) => {
      authEventReceived = true
      if (event === 'SIGNED_OUT' && (expiredSession || (identity.current && !signingOut.current))) {
        setError(new AppError('authentication', 'Sua sessão expirou. Entre novamente para continuar.'))
      } else {
        expiredSession = false
        setError(null)
      }
      applyUser(session?.user ?? null)
    })
    // API authentication failures must also end the private UI session. This runs
    // outside onAuthStateChange to avoid awaiting Auth calls inside its lock.
    function handleRequestError(requestError: unknown) {
      if (!active || expiredSession || !identity.current || !(requestError instanceof AppError) || requestError.kind !== 'authentication') return
      expiredSession = true
      setError(requestError)
      applyUser(null)
      void client.auth.signOut({ scope: 'local' }).then(({ error: logoutError }) => {
        if (active && logoutError) setError(toAppError(logoutError))
      }).catch((logoutError: unknown) => { if (active) setError(toAppError(logoutError)) })
    }
    const stopQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') handleRequestError(event.query.state.error)
    })
    const stopMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') handleRequestError(event.mutation.state.error)
    })
    void client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventReceived) return
      if (sessionError) {
        setError(toAppError(sessionError))
        applyUser(null)
        return
      }
      applyUser(data.session?.user ?? null)
    }).catch((sessionError: unknown) => {
      if (active && !authEventReceived) { setError(toAppError(sessionError)); applyUser(null) }
    })
    return () => { active = false; subscription.subscription.unsubscribe(); stopQueries(); stopMutations() }
  }, [])

  async function signIn(email: string, password: string) {
    const { data, error: signInError } = await getSupabase().auth.signInWithPassword({ email, password })
    if (signInError) {
      if (signInError.code === 'email_not_confirmed') throw new AppError('authentication', 'Confirme seu e-mail pelo link recebido antes de entrar.')
      if (signInError.code === 'invalid_credentials') throw new AppError('authentication', 'E-mail ou senha incorretos. Confira seus dados e tente novamente.')
      throw toAppError(signInError)
    }
    if (!data.user) throw new AppError('contract', 'O servidor não confirmou sua sessão. Tente entrar novamente.')
    setError(null)
  }

  async function signOut() {
    signingOut.current = true
    try {
      const { error: signOutError } = await getSupabase().auth.signOut({ scope: 'local' })
      if (signOutError) throw toAppError(signOutError)
      queryClient.clear()
      setError(null)
      setUser(null)
    } finally {
      signingOut.current = false
    }
  }

  return <AuthContext.Provider value={{ user, loading, error, configured: isSupabaseConfigured, signIn, signOut }}>{children}</AuthContext.Provider>
}
