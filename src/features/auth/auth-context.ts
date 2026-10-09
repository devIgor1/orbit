import { createContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { AppError } from '@/lib/errors/app-error'

export type AuthContextValue = {
  user: User | null
  loading: boolean
  error: AppError | null
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
