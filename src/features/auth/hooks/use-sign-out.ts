import { useState } from 'react'
import { useAuth } from '../use-auth'

export function useSignOut() {
  const auth = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  async function signOut() {
    setError(null)
    setPending(true)
    try {
      await auth.signOut()
    } catch (failure) {
      setError(failure)
    } finally {
      setPending(false)
    }
  }
  return { signOut, pending, error }
}
