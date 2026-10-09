import { ArrowUpRight, CircleAlert, FolderOpen, LoaderCircle, PlugZap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/errors/app-error'

export function LoadingState({ label = 'Buscando as informações…' }: { label?: string }) {
  return (
    <div className="query-state" role="status">
      <LoaderCircle className="loading-spinner" />
      <p>{label}</p>
    </div>
  )
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="query-state">
      <span className="state-icon">
        <FolderOpen />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = errorMessage(error)
  return (
    <div className="query-state query-state-error" role="alert">
      <span className="state-icon">
        <CircleAlert />
      </span>
      <h3>Algo saiu da órbita</h3>
      <p>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
export function ConnectionState({ compact = false }: { compact?: boolean }) {
  return (
    <div className="query-state connection-state" data-compact={compact}>
      <span className="state-icon">
        <PlugZap />
      </span>
      <h3>Vamos conectar seu workspace?</h3>
      <p>Seus projetos, pessoas e ideias vão se encontrar aqui. Conecte o Supabase para começar.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/settings">
          Configurar conexão <ArrowUpRight />
        </Link>
      </Button>
    </div>
  )
}
