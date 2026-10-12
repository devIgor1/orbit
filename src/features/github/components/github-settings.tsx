import { useState } from 'react'
import { GitFork, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { SettingsSection } from '@/features/settings/components/settings-section'
import { useGithubConfig, useGithubMutations, useGithubRepositories } from '../hooks/use-github'

export function GithubSettings({ canManage }: { canManage: boolean }) {
  const config = useGithubConfig()
  const repositories = useGithubRepositories()
  const { connect, disconnect } = useGithubMutations()
  const [name, setName] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    try {
      const result = await connect.mutateAsync(name.trim())
      window.location.assign(result.url)
    } catch {
      /* The mutation error remains visible and preserves the repository name. */
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
              Instale o App nos repositórios desejados. Depois, conecte cada repositório com uma conta administradora no
              GitHub.
            </p>
            <Button asChild variant="outline">
              <a href={config.data.installationUrl} target="_blank" rel="noreferrer">
                <GitFork />
                Instalar GitHub App
                <ExternalLink />
              </a>
            </Button>
            <form className="github-connect-form" onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="github-repository">Repositório</label>
                <Input
                  id="github-repository"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="organizacao/repositorio"
                  pattern="[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+"
                  maxLength={201}
                  required
                  disabled={connect.isPending}
                />
              </div>
              <Button type="submit" disabled={connect.isPending}>
                {connect.isPending ? 'Conectando…' : 'Conectar repositório'}
              </Button>
            </form>
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
