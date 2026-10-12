import type { z } from 'zod'
import { getSupabase } from '@/lib/supabase/client'
import { AppError } from '@/lib/errors/app-error'
import { githubApiError } from './github-errors'

export async function invokeGithub<T>(body: object, schema: z.ZodType<T>, signal?: AbortSignal) {
  const { data, error } = await getSupabase().functions.invoke('github-api', { body, ...(signal ? { signal } : {}) })
  if (error) throw await githubApiError(error)
  const result = schema.safeParse(data)
  if (!result.success) throw new AppError('contract', 'O servidor não confirmou os dados da integração GitHub.')
  return result.data
}
