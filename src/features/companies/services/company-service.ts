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

function companyError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code === '22023') return new AppError('contract', 'O nome digitado não confere com o nome da empresa.')
  if (code === 'P0002') return new AppError('contract', 'Esta empresa não está mais na lixeira. Atualize a página.')
  return toAppError(error)
}

export async function renameCompany(workspaceId: string, name: string) {
  const { data, error } = await getSupabase().rpc('rename_company', {
    target_workspace: workspaceId,
    company_name: name,
  })
  if (error) throw toAppError(error)
  return requireRecord(data, workspaceId)
}

export async function deleteCompany(workspaceId: string, confirmation: string) {
  const { data, error } = await getSupabase().rpc('delete_company', { target_workspace: workspaceId, confirmation })
  if (error) throw companyError(error)
  if (data !== workspaceId) throw new AppError('contract', 'O servidor não confirmou a exclusão da empresa.')
}

export async function fetchDeletedCompanies() {
  const { data, error } = await getSupabase().rpc('deleted_companies')
  if (error) throw toAppError(error)
  return requireCollection(data)
}

export async function restoreCompany(workspaceId: string) {
  const { data, error } = await getSupabase().rpc('restore_company', { target_workspace: workspaceId })
  if (error) throw companyError(error)
  if (data !== workspaceId) throw new AppError('contract', 'O servidor não confirmou a restauração da empresa.')
  return data
}
