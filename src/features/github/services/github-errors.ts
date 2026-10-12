import { FunctionsHttpError } from '@supabase/supabase-js'
import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors/app-error'

const messages: Record<string, string> = {
  GITHUB_NOT_CONFIGURED: 'A integração GitHub ainda precisa ser ativada pela administração do Orbit.',
  GITHUB_UNAVAILABLE:
    'O repositório, a branch ou o PR não está disponível. Confira o acesso do GitHub App e reconecte o repositório se necessário.',
  GITHUB_ADMIN_REQUIRED: 'Conecte com uma conta administradora deste repositório no GitHub.',
  GITHUB_NO_ADMIN_REPOSITORIES:
    'Nenhum repositório com acesso administrativo foi autorizado. Conecte novamente e selecione os repositórios no GitHub.',
  GITHUB_REPOSITORY_LIMIT:
    'Esta conta disponibiliza mais de 1.000 repositórios. Conecte novamente e selecione apenas os repositórios desta empresa no GitHub.',
  GITHUB_INSTALLATION_LIMIT:
    'Esta conta tem mais instalações do que podemos listar agora. Entre em contato com a administração do Orbit.',
  GITHUB_OAUTH_FAILED: 'A autorização do GitHub expirou ou foi recusada. Inicie a conexão novamente nas configurações.',
  GITHUB_STATE_INVALID:
    'Esta tentativa de conexão expirou ou já foi utilizada. Volte às configurações e clique em Conectar GitHub para começar novamente.',
  INVALID_REQUEST: 'A solicitação é inválida ou expirou. Revise os dados e inicie novamente.',
  ALREADY_LINKED: 'Esta tarefa já tem um vínculo. Atualize os dados antes de continuar.',
  GITHUB_BRANCH_REQUIRED: 'Selecione uma branch de trabalho diferente da branch padrão do repositório.',
  GITHUB_AMBIGUOUS_BRANCH: 'Esta branch tem vários PRs possíveis. Remova o vínculo e selecione o PR desejado.',
  GITHUB_RATE_LIMIT: 'O GitHub limitou as consultas. Aguarde um pouco e tente novamente.',
  GITHUB_TOO_MANY_RESULTS: 'O GitHub retornou resultados demais. Vincule diretamente o PR ou consulte a administração.',
  GITHUB_CONTRACT: 'O GitHub não confirmou os dados esperados. Atualize as informações e tente novamente.',
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
