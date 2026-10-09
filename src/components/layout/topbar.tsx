import { Command, Menu, Search, SlidersHorizontal } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Topbar({
  onMenu,
  onSearch,
  configured,
}: {
  onMenu: () => void
  onSearch: () => void
  configured: boolean
}) {
  const { pathname } = useLocation()
  const title = pathname.startsWith('/projects')
    ? 'Projetos'
    : pathname.startsWith('/team')
      ? 'Equipe'
      : pathname.startsWith('/settings')
        ? 'Configurações'
        : 'Visão geral'
  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <Button className="mobile-menu-button" variant="ghost" size="icon" onClick={onMenu} aria-label="Abrir menu">
          <Menu />
        </Button>
        <span>Workspace</span>
        <span className="breadcrumb-slash">/</span>
        <strong>{title}</strong>
      </div>
      <div className="topbar-actions">
        <button type="button" className="global-search" aria-label="Buscar no workspace" onClick={onSearch}>
          <Search />
          <span>Buscar no workspace</span>
          <kbd>
            <Command /> K
          </kbd>
        </button>
        <span className="topbar-divider" />
        <Link className="connection-indicator" to="/settings" data-connected={configured}>
          <span />
          {configured ? 'Conectado' : 'Conectar workspace'}
        </Link>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/settings" aria-label="Configurações do workspace">
            <SlidersHorizontal />
          </Link>
        </Button>
      </div>
    </header>
  )
}
