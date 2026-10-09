import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/use-auth'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { LoadingState, ErrorState } from '@/components/shared/query-state'
import { Sheet } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { WorkspaceSearch } from './workspace-search'
import { HelpDialog } from './help-dialog'

export function AppShell() {
  const auth = useAuth()
  const workspace = useWorkspace()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<unknown>(null)
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        setSearchOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  useEffect(() => {
    const heading = document.querySelector('h1')
    document.title = `${heading?.textContent ?? 'Workspace'} — Orbit`
  }, [location.pathname, workspace.data])
  if (auth.loading) return <LoadingState label="Preparando seu espaço…" />
  if (auth.configured && !auth.user)
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  const sidebar = (
    <Sidebar
      workspaceName={workspace.data?.workspace.name}
      name={workspace.data?.profile.full_name}
      jobTitle={workspace.data?.profile.job_title}
      avatar={workspace.data?.profile.avatar_url}
      authenticated={!!auth.user}
      onHelp={() => {
        setMobileOpen(false)
        setHelpOpen(true)
      }}
      onNavigate={() => setMobileOpen(false)}
      onSignOut={() => {
        setSignOutError(null)
        void auth.signOut().catch(setSignOutError)
      }}
    />
  )
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="desktop-sidebar">{sidebar}</aside>
      <div className="app-main">
        <Topbar
          onMenu={() => setMobileOpen(true)}
          onSearch={() => setSearchOpen(true)}
          configured={auth.configured && !!auth.user}
        />
        <main className="main-content" id="main-content" tabIndex={-1}>
          {signOutError ? (
            <ErrorState error={signOutError} onRetry={() => setSignOutError(null)} />
          ) : workspace.isError && auth.configured ? (
            <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="app-footer">
          <span>Feito para tirar boas ideias do papel.</span>
          <span>
            Em sua órbita. <span className="footer-spark">✳</span>
          </span>
        </footer>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen} title="Seu workspace">
        {sidebar}
      </Sheet>
      <WorkspaceSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  )
}
