import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'
import { getSupabase } from '@/lib/supabase/client'
import { requireCollection, requireRecord } from '@/lib/supabase/require-data'

export async function fetchCompanies() {
  const { data, error } = await getSupabase().from('workspaces').select('*').order('name').order('id')
  if (error) throw toAppError(error)
  return requireCollection(data)
}

export async function createCompany(name: string) {
  const { data, error } = await getSupabase().rpc('create_company', { company_name: name })
  if (error) throw toAppError(error)
  return requireRecord(data)
}

export async function selectCompany(workspaceId: string) {
  const { data, error } = await getSupabase().rpc('select_company', { target_workspace: workspaceId })
  if (error) throw toAppError(error)
  if (!z.uuid().safeParse(data).success || data !== workspaceId)
    throw new AppError('contract', 'O servidor não confirmou a empresa selecionada.')
  return data
}
