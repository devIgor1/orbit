import { AppError } from '@/lib/errors/app-error'

export function requireRecord<T extends { id: string }>(data: T | null, expectedId?: string): T {
  if (!data || typeof data.id !== 'string' || !data.id || (expectedId && data.id !== expectedId)) {
    throw new AppError('contract', 'O servidor não confirmou o registro afetado. Tente novamente.')
  }
  return data
}

export function requireCollection<T>(data: T[] | null): T[] {
  if (!Array.isArray(data)) throw new AppError('contract', 'O servidor retornou uma listagem incompleta. Tente novamente.')
  return data
}
