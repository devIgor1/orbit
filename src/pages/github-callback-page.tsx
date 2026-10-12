import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useGithubCallback } from '@/features/github/hooks/use-github-callback'

export function GithubCallbackPage() {
  const connection = useGithubCallback()
  return <div className="page-content"><PageHeader title="Conexão com o GitHub" description="Validando o acesso ao repositório da sua empresa." />
    <section className="panel github-callback">
      {connection.isError ? <ErrorState error={connection.error} /> : connection.isPending ? <LoadingState label="Confirmando autorização no GitHub…" /> :
        <p className="form-success" role="status">Repositório conectado à empresa que iniciou a autorização. Agora ele pode ser vinculado a um projeto.</p>}
      <Button asChild variant="outline"><Link to="/settings">Voltar às configurações</Link></Button>
    </section>
  </div>
}
