import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireRecord } from '@/lib/supabase/require-data'
import type { Profile, TeamMember } from '@/lib/supabase/database.types'

export type ProfileInput = Pick<Profile, 'full_name'> & Partial<Pick<Profile, 'job_title' | 'avatar_url'>>

const directorySchema = z.array(z.object({
  id: z.uuid(), full_name: z.string().min(1), avatar_url: z.url().nullable(),
  job_title: z.string().nullable(), role: z.enum(['admin', 'member']),
  is_active: z.boolean(),
  assigned_tasks: z.number().int().nonnegative(), completed_tasks: z.number().int().nonnegative(),
})).refine((members) => new Set(members.map((member) => member.id)).size === members.length)

export async function fetchTeam(workspaceId: string, search = '', includeRemoved = false): Promise<TeamMember[]> {
  const { data, error } = await getSupabase().rpc('team_directory', { target_workspace: workspaceId, search_term: search, include_removed: includeRemoved })
  if (error) throw toAppError(error)
  const result = directorySchema.safeParse(data)
  if (!result.success) throw new AppError('contract', 'O diretório da equipe retornou um formato inesperado. Tente novamente.')
  return result.data
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const { data, error } = await getSupabase().from('profiles').update(input).eq('id', userId).select('*').single()
  if (error) throw toAppError(error)
  return requireRecord(data, userId)
}
