export type ErrorKind = 'configuration' | 'authentication' | 'permission' | 'network' | 'contract' | 'unknown' | 'onboarding'

export class AppError extends Error {
  readonly kind: ErrorKind
  constructor(kind: ErrorKind, message: string) {
    super(message)
    this.name = 'AppError'
    this.kind = kind
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (typeof error === 'object' && error !== null) {
    const code = 'code' in error ? String(error.code) : ''
    const status = 'status' in error ? Number(error.status) : 0
    if (status === 401 || ['PGRST301', 'PGRST302', 'PGRST303', 'bad_jwt', 'refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired'].includes(code)) {
      return new AppError('authentication', 'Sua sessão expirou. Entre novamente para continuar.')
    }
    if (status === 403 || code === '42501') {
      return new AppError('permission', 'Você não tem permissão para realizar esta ação.')
    }
    if (code === 'PGRST116') return new AppError('permission', 'Este registro não existe ou não está disponível para sua conta.')
    if (['23503', '23514', '23505', '22P02'].includes(code)) {
      return new AppError('contract', 'Revise os dados informados. Um vínculo ou valor não é válido.')
    }
  }
  if (error instanceof TypeError || (error instanceof Error && /fetch|network/i.test(error.message))) {
    return new AppError('network', 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
  }
  return new AppError('unknown', 'Não foi possível concluir a operação. Tente novamente em instantes.')
}

export function errorMessage(error: unknown): string {
  return toAppError(error).message
}
