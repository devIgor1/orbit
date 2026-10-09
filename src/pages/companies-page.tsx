import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ConnectionState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { useCompanyAccess } from '@/features/companies/hooks/use-companies'
import { CompanyForm } from '@/features/companies/components/company-form'
import { CompanyAccessList } from '@/features/companies/components/company-access-list'
import { IncomingInvitations } from '@/features/companies/components/incoming-invitations'

export function CompaniesPage() {
  const auth = useAuth()
  const access = useCompanyAccess()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [signOutError, setSignOutError] = useState<unknown>(null)
  const [signingOut, setSigningOut] = useState(false)
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
  const incomingInvitations = (
    <section className="panel company-panel company-incoming">
      <h2>Convites para você</h2>
      <IncomingInvitations
        invitationId={params.get('invitation')}
        busy={access.isPending}
        onAccept={(id) => void enter({ action: 'accept', id })}
      />
    </section>
  )
  return (
    <main className="companies-page">
      <header className="companies-header">
        <Brand />
        <div className="companies-account">
          <span>{auth.user.email}</span>
          <Button
            variant="outline"
            disabled={signingOut || access.isPending}
            onClick={async () => {
              setSignOutError(null)
              setSigningOut(true)
              try {
                await auth.signOut()
              } catch (error) {
                setSignOutError(error)
              } finally {
                setSigningOut(false)
              }
            }}
          >
            <LogOut /> Sair
          </Button>
        </div>
      </header>
      <div className="companies-content page-stack">
        <PageHeader
          eyebrow="SUA EQUIPE, SUA ÓRBITA"
          title="Vamos criar juntos?"
          description="Escolha uma empresa, aceite um convite ou crie um novo espaço para sua equipe."
        />
        {Boolean(signOutError) && <ErrorState error={signOutError} />}
        {access.isError && <ErrorState error={access.error} />}
        <div className="companies-grid">
          {params.has('invitation') && incomingInvitations}
          <section className="panel company-panel">
            <h2>Suas empresas</h2>
            <CompanyAccessList busy={access.isPending} onSelect={(id) => void enter({ action: 'select', id })} />
          </section>
          <section className="panel company-panel">
            <h2>Cadastrar empresa</h2>
            <CompanyForm busy={access.isPending} onCreate={(name) => enter({ action: 'create', name })} />
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
