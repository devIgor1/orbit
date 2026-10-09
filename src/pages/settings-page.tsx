import { Check, Database, ExternalLink, Link2, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/use-auth'
import { useWorkspace } from '@/features/workspace/use-workspace'
export function SettingsPage() {
  const auth = useAuth()
  const workspace = useWorkspace()
  return (
    <div className="page-content settings-page">
      <PageHeader
        title="Um espaço do seu jeito"
        description="Conexão, pessoas e os detalhes que fazem tudo funcionar."
      />
      <div className="settings-layout">
        <section className="panel settings-panel">
          <div className="settings-heading">
            <span className="settings-service-icon">
              <Database />
            </span>
            <div>
              <span className="eyebrow">INTEGRAÇÃO DO WORKSPACE</span>
              <h2>Conectado às suas ideias.</h2>
              <p>O Supabase guarda seus projetos, tarefas e conversas com segurança.</p>
            </div>
          </div>
          <div className="connection-status-card" data-connected={auth.configured}>
            <span className="connection-status-icon">{auth.configured ? <Check /> : <Link2 />}</span>
            <div>
              <strong>{auth.configured ? 'Supabase configurado' : 'Seu workspace está quase pronto'}</strong>
              <p>
                {auth.configured
                  ? 'A aplicação está configurada para utilizar o backend.'
                  : 'Configure a conexão para começar a trabalhar com dados reais.'}
              </p>
            </div>
            <span className="connection-status-label">{auth.configured ? 'Conectado' : 'Pendente'}</span>
          </div>
          {auth.configured ? (
            <dl className="settings-details">
              <div>
                <dt>Workspace</dt>
                <dd>{workspace.data?.workspace.name ?? 'Aguardando autenticação'}</dd>
              </div>
              <div>
                <dt>Seu acesso</dt>
                <dd>
                  {workspace.data?.role === 'admin'
                    ? 'Administrador'
                    : workspace.data?.role === 'member'
                      ? 'Membro'
                      : 'Não autenticado'}
                </dd>
              </div>
              <div>
                <dt>Persistência</dt>
                <dd>PostgreSQL · Supabase</dd>
              </div>
            </dl>
          ) : (
            <div className="setup-instructions">
              <h3>Configure em poucos passos</h3>
              <ol>
                <li>Crie um projeto Supabase ou inicie o ambiente local seguindo o README.</li>
                <li>
                  Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no arquivo{' '}
                  <code>.env.local</code>.
                </li>
                <li>Aplique as migrations, provisione seu usuário e reinicie a aplicação.</li>
              </ol>
            </div>
          )}
          <div className="settings-panel-footer">
            <Button variant="outline" asChild><Link to="/companies">Gerenciar empresas e convites</Link></Button>
            <Button asChild>
              <Link to={auth.user ? '/dashboard' : '/login'}>
                {auth.user ? 'Voltar ao workspace' : 'Entrar no workspace'}
              </Link>
            </Button>
            <a
              className="text-link"
              href="https://supabase.com/docs/guides/local-development"
              target="_blank"
              rel="noreferrer"
            >
              Documentação do Supabase <ExternalLink />
            </a>
          </div>
        </section>
        <aside className="settings-note">
          <ShieldCheck />
          <h3>Seu trabalho, bem cuidado.</h3>
          <p>
            Os dados pertencem ao seu workspace. Cada acesso é validado pelo backend, respeitando as permissões de cada
            pessoa.
          </p>
          <Link className="text-link" to="/team">
            Conhecer a equipe <ExternalLink />
          </Link>
        </aside>
      </div>
    </div>
  )
}
