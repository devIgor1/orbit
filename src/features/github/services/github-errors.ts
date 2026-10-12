import { FunctionsHttpError } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'

const messages: Record<string, string> = {
  GITHUB_NOT_CONFIGURED: 'A integração GitHub ainda precisa ser ativada pela administração do Orbit.',
  GITHUB_UNAVAILABLE:
    'O repositório, a branch ou o PR não está disponível. Confira o acesso do GitHub App e reconecte o repositório se necessário.',
  GITHUB_ADMIN_REQUIRED: 'Conecte com uma conta administradora deste repositório no GitHub.',
  GITHUB_OAUTH_FAILED: 'A autorização do GitHub expirou ou foi recusada. Inicie a conexão novamente nas configurações.',
  INVALID_REQUEST: 'A solicitação é inválida ou expirou. Revise os dados e inicie novamente.',
  ALREADY_LINKED: 'Esta tarefa já tem um vínculo. Atualize os dados antes de continuar.',
  GITHUB_BRANCH_REQUIRED: 'Informe uma branch de trabalho diferente da branch padrão do repositório.',
  GITHUB_AMBIGUOUS_BRANCH: 'Esta branch tem vários PRs possíveis. Remova o vínculo e informe o número do PR desejado.',
  GITHUB_RATE_LIMIT: 'O GitHub limitou as consultas. A sincronização tentará novamente automaticamente.',
  GITHUB_TOO_MANY_RESULTS: 'O GitHub retornou resultados demais. Vincule diretamente o PR ou consulte a administração.',
  GITHUB_CONTRACT: 'O GitHub não confirmou os dados esperados. A sincronização tentará novamente.',
  GITHUB_FAILED: 'Não foi possível confirmar a operação no GitHub. Tente novamente em instantes.',
}
export function githubError(code: string) {
  if (code === 'AUTH_REQUIRED') return toAppError({ status: 401 })
  if (code === 'FORBIDDEN') return toAppError({ status: 403 })
  return new AppError(
    code === 'GITHUB_NOT_CONFIGURED' ? 'configuration' : 'contract',
    messages[code] ?? messages.GITHUB_FAILED,
  )
}
export async function githubApiError(error: unknown) {
  if (!(error instanceof FunctionsHttpError)) return toAppError(error)
  try {
    const result = z.object({ code: z.string() }).safeParse(await error.context.json())
    return result.success ? githubError(result.data.code) : toAppError({ status: error.context.status })
  } catch {
    return toAppError({ status: error.context.status })
  }
}
