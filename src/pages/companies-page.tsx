import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AccountHeader } from '@/components/layout/account-header'
import { PageHeader } from '@/components/layout/page-header'
import { ConnectionState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { useCompanyAccess } from '@/features/companies/hooks/use-companies'
import { CompanyForm } from '@/features/companies/components/company-form'
import { CompanyAccessList } from '@/features/companies/components/company-access-list'
import { IncomingInvitations } from '@/features/companies/components/incoming-invitations'

export function CompaniesPage() {
  const auth = useAuth()
  const access = useCompanyAccess()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const logout = useSignOut()
  if (auth.loading) return <LoadingState label="Preparando suas empresas…" />
  if (!auth.configured) return <ConnectionState />
  if (!auth.user)
    return (
      <Navigate to={`/login?next=${encodeURIComponent('/companies' + (params.size ? `?${params}` : ''))}`} replace />
    )
  async function enter(input: Parameters<typeof access.mutateAsync>[0]) {
    try {
      await access.mutateAsync(input)
      navigate('/dashboard', { replace: true })
    } catch {
      /* The mutation error is rendered below; company form values remain intact. */
    }
  }
  const busy = access.isPending || logout.pending
  const incomingInvitations = (
    <section className="panel company-panel company-incoming">
      <h2>Convites para você</h2>
      <IncomingInvitations
        invitationId={params.get('invitation')}
        accountEmail={auth.user.email}
        busy={busy}
        onAccept={(id) => void enter({ action: 'accept', id })}
        onSwitchAccount={() => void logout.signOut()}
      />
    </section>
  )
  return (
    <main className="companies-page">
      <AccountHeader email={auth.user.email} busy={busy} onSignOut={() => void logout.signOut()} />
      <div className="companies-content page-stack">
        <PageHeader
          eyebrow="SUA EQUIPE, SUA ÓRBITA"
          title="Vamos criar juntos?"
          description="Escolha uma empresa, aceite um convite ou crie um novo espaço para sua equipe."
        />
        {Boolean(logout.error) && <ErrorState error={logout.error} />}
        {access.isError && <ErrorState error={access.error} />}
        <div className="companies-grid">
          {params.has('invitation') && incomingInvitations}
          <section className="panel company-panel">
            <h2>Suas empresas</h2>
            <CompanyAccessList busy={busy} onSelect={(id) => void enter({ action: 'select', id })} />
          </section>
          <section className="panel company-panel">
            <h2>Cadastrar empresa</h2>
            <CompanyForm busy={busy} onCreate={(name) => enter({ action: 'create', name })} />
          </section>
          {!params.has('invitation') && incomingInvitations}
        </div>
        <Link className="text-link" to="/">
          Conhecer o Orbit
        </Link>
      </div>
    </main>
  )
}
