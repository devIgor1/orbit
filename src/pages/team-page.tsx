import { useDeferredValue, useState } from 'react'
import { Search, UserRoundPen, UsersRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { ConnectionState, EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/use-auth'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { useTeam } from '@/features/team/hooks/use-team'
import { MemberCard } from '@/features/team/components/member-card'
import { ProfileForm } from '@/features/team/components/profile-form'

export function TeamPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const deferredSearch = useDeferredValue(search)
  const { configured, user } = useAuth()
  const workspace = useWorkspace()
  const team = useTeam(deferredSearch)
  const [profileOpen, setProfileOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  return <div className="page-stack">
    <PageHeader eyebrow="CONEXÕES QUE CRIAM" title="Nossa equipe" description="Talentos diferentes. Um mesmo propósito." actions={<Button variant="outline" disabled={!workspace.isSuccess} onClick={() => { setSaved(false); setProfileOpen(true) }}><UserRoundPen /> Editar meu perfil</Button>} />
    <section className="team-intro"><span className="team-intro-icon"><UsersRound /></span><div><h2>O melhor trabalho é feito junto.</h2><p>Conheça quem transforma as ideias do seu workspace em realidade.</p></div></section>
    {saved && <p role="status" className="success-notice">Seu perfil foi atualizado.</p>}
    <div className="filter-bar"><div className="search-field"><Search /><Input aria-label="Buscar pessoas" placeholder="Buscar por nome…" value={search} onChange={(event) => { const next = new URLSearchParams(params); if (event.target.value) next.set('search', event.target.value); else next.delete('search'); setParams(next, { replace: true }) }} /></div><span className="results-count">{team.isSuccess && `${team.data.length} ${team.data.length === 1 ? 'pessoa' : 'pessoas'}`}</span></div>
    {!configured ? <ConnectionState /> : workspace.isError ? <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} /> : workspace.isPending || team.isPending ? <LoadingState label="Reunindo sua equipe…" /> : team.isError ? <ErrorState error={team.error} onRetry={() => void team.refetch()} /> : team.data.length === 0 ? <EmptyState title={search ? 'Nenhuma pessoa encontrada' : 'Sua equipe começa aqui'} description={search ? 'Tente buscar por outro nome.' : 'Os membros vinculados ao seu workspace aparecerão aqui.'} /> : <section className="team-grid" aria-label="Membros do workspace">{team.data.map((member) => <MemberCard key={member.id} member={member} isSelf={member.id === user?.id} />)}</section>}
    {workspace.isSuccess && <Dialog open={profileOpen} onOpenChange={setProfileOpen} title="Editar meu perfil" description="Deixe seu perfil com a sua cara."><ProfileForm key={workspace.data.profile.id + workspace.data.profile.full_name + workspace.data.profile.job_title} profile={workspace.data.profile} onSaved={() => { setProfileOpen(false); setSaved(true) }} /></Dialog>}
  </div>
}
