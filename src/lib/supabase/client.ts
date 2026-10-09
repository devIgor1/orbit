import { createClient } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/app-error'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const isSupabaseConfigured = Boolean(url && publishableKey && /^https?:\/\//.test(url))
const client = isSupabaseConfigured && url && publishableKey
  ? createClient<Database>(url, publishableKey)
  : null

export function getSupabase() {
  if (!client) {
    throw new AppError('configuration', 'Conecte seu workspace: configure as variáveis públicas do Supabase no arquivo .env.local.')
  }
  return client
}
