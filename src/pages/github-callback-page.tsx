import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useGithubCallback } from '@/features/github/hooks/use-github-callback'
import { GithubInstallationChoice } from '@/features/github/components/github-installation-choice'
import { GithubRepositoryChoice } from '@/features/github/components/github-repository-choice'

export function GithubCallbackPage() {
  const connection = useGithubCallback()
  return (
    <div className="page-content">
      <PageHeader title="Conexão com o GitHub" description="Preparando os repositórios da sua empresa." />
      <section className="panel github-callback">
        {connection.isError ? (
          <ErrorState error={connection.error} />
        ) : connection.isPending || connection.data.status === 'redirect' ? (
          <LoadingState label="Confirmando autorização no GitHub…" />
        ) : connection.data.status === 'choose' ? (
          <GithubInstallationChoice state={connection.data.state} installations={connection.data.installations} />
        ) : connection.data.status === 'repositories' ? (
          <GithubRepositoryChoice choice={connection.data} />
        ) : (
          <div className="github-content">
            <p className="form-success" role="status">
              GitHub conectado{connection.data.accountLogin ? `: ${connection.data.accountLogin}` : ''}.{' '}
              {connection.data.repositoryCount === 1
                ? '1 repositório disponível'
                : `${connection.data.repositoryCount} repositórios disponíveis`}{' '}
              na empresa que iniciou a conexão. Agora você pode selecioná-los nos projetos.
            </p>
            {connection.data.skippedCount > 0 && (
              <p className="github-note">
                {connection.data.skippedCount} repositório(s) sem permissão de escrita não foram conectados.
              </p>
            )}
          </div>
        )}
        <Button asChild variant="outline">
          <Link to="/settings">Voltar às configurações</Link>
        </Button>
      </section>
    </div>
  )
}
