import {
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  LayoutDashboard,
  LogIn,
  LogOut,
  Settings2,
  Users,
} from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Brand } from './brand'

interface SidebarProps {
  workspaceName?: string
  name?: string
  jobTitle?: string | null
  avatar?: string | null
  authenticated: boolean
  onHelp: () => void
  onNavigate?: () => void
  onSignOut: () => void
}
const navigation = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/projects', label: 'Projetos', icon: FolderKanban },
  { to: '/team', label: 'Equipe', icon: Users },
]
export function Sidebar({
  workspaceName,
  name,
  jobTitle,
  avatar,
  authenticated,
  onHelp,
  onNavigate,
  onSignOut,
}: SidebarProps) {
  const companyLabel = workspaceName ?? 'Seu workspace'
  const profileName = name ?? 'Bem-vindo ao Orbit'
  const profileCaption = jobTitle ?? (authenticated ? 'Seu espaço criativo' : 'Vamos começar?')

  return (
    <div className="sidebar-content">
      <div className="sidebar-brand">
        <Brand />
        <span className="edition-label">Seu espaço de criação</span>
      </div>
      <Link
        className="workspace-switch"
        to="/companies"
        onClick={onNavigate}
        aria-label={`${companyLabel}: trocar ou cadastrar empresa`}
      >
        <span className="workspace-emblem" aria-hidden="true">
          {workspaceName?.slice(0, 1) ?? 'O'}
        </span>
        <strong title={companyLabel}>{companyLabel}</strong>
        <small className="workspace-switch-action">
          Trocar ou cadastrar <ChevronRight aria-hidden="true" />
        </small>
      </Link>
      <div className="navigation-section">
        <p className="navigation-label">Workspace</p>
        <nav aria-label="Navegação principal">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) => `navigation-link${isActive ? ' navigation-link-active' : ''}`}
            >
              <Icon />
              <span className="navigation-link-label">{label}</span>
              <span className="nav-active-dot" />
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar-footer">
        <div className="sidebar-note">
          <span className="sidebar-note-symbol">
            <CircleHelp />
          </span>
          <h3>Um bom começo.</h3>
          <p>Encontre seu caminho entre projetos, tarefas e pessoas.</p>
          <button className="text-link" onClick={onHelp}>
            Guia do workspace <ArrowUpRight />
          </button>
        </div>
        <nav className="sidebar-bottom-nav" aria-label="Workspace">
          <NavLink
            className={({ isActive }) => `navigation-link${isActive ? ' navigation-link-active' : ''}`}
            to="/settings"
            onClick={onNavigate}
          >
            <Settings2 />
            <span className="navigation-link-label">Configurações</span>
          </NavLink>
          <button className="navigation-link" onClick={onHelp}>
            <CircleHelp />
            <span className="navigation-link-label">Ajuda e primeiros passos</span>
            <ArrowUpRight />
          </button>
        </nav>
        <div className="sidebar-profile">
          <Avatar name={profileName} src={avatar} />
          <span>
            <strong title={profileName}>{profileName}</strong>
            <small title={profileCaption}>{profileCaption}</small>
          </span>
          {authenticated ? (
            <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sair da conta">
              <LogOut />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" asChild>
              <Link to="/login" aria-label="Entrar na conta">
                <LogIn />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
