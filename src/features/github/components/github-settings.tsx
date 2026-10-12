import { GitFork } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { useGithubConfig, useGithubMutations, useGithubRepositories } from '../hooks/use-github'

export function GithubSettings({ canManage }: { canManage: boolean }) {
  const config = useGithubConfig()
  const repositories = useGithubRepositories()
  const { connect, disconnect } = useGithubMutations()
  async function connectAccount() {
    try {
      const result = await connect.mutateAsync()
      window.location.assign(result.url)
    } catch {
      /* The mutation keeps the error visible and allows another attempt. */
    }
  }
  return (
    <SettingsSection
      title="GitHub"
      description="Conecte os repositórios da empresa e acompanhe as entregas pelo Orbit."
    >
      <div className="github-content">
        {config.isError ? (
          <ErrorState error={config.error} onRetry={() => void config.refetch()} />
        ) : config.isPending ? (
          <LoadingState label="Verificando integração…" />
        ) : !config.data.configured ? (
          <p className="github-note" role="status">
            A integração GitHub ainda não foi ativada. A administração precisa cadastrar o GitHub App e configurar as
            credenciais.
          </p>
        ) : canManage ? (
          <>
            <p className="github-note">
              Autorize sua conta no GitHub e escolha a conta ou organização que deseja conectar. Se o App já estiver
              instalado, os repositórios autorizados serão importados automaticamente.
            </p>
            <Button
              className="github-connect-button"
              disabled={connect.isPending}
              onClick={() => void connectAccount()}
            >
              <GitFork />
              {connect.isPending ? 'Conectando…' : 'Conectar GitHub'}
            </Button>
            <p className="github-note">Use uma conta com acesso de administrador aos repositórios escolhidos.</p>
            {connect.isError && <ErrorState error={connect.error} />}
          </>
        ) : (
          <p className="github-note">Administradores da empresa podem conectar repositórios.</p>
        )}
        {disconnect.isError && <ErrorState error={disconnect.error} />}
        {repositories.isError ? (
          <ErrorState error={repositories.error} onRetry={() => void repositories.refetch()} />
        ) : repositories.isPending ? (
          <LoadingState label="Buscando repositórios…" />
        ) : repositories.data.length === 0 ? (
          <EmptyState
            title="Nenhum repositório conectado"
            description="Os repositórios conectados ficarão disponíveis nos projetos desta empresa."
          />
        ) : (
          <ul className="github-repositories">
            {repositories.data.map((repo) => (
              <li key={repo.id}>
                <div>
                  <strong>{repo.full_name}</strong>
                  <p className="github-note">
                    {repo.active ? 'Conectado' : 'Desconectado — conecte novamente para retomar'} ·{' '}
                    {repo.is_private ? 'Privado' : 'Público'}
                  </p>
                </div>
                {canManage && repo.active && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnect.isPending}
                    onClick={() => disconnect.mutate(repo.id)}
                  >
                    Desconectar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SettingsSection>
  )
}
