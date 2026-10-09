import { PageHeader } from '@/components/layout/page-header'
import { ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { SettingsCompany } from '@/features/settings/components/settings-company'
import { SettingsHelp } from '@/features/settings/components/settings-help'
import { SettingsProfile } from '@/features/settings/components/settings-profile'
import { useWorkspace } from '@/features/workspace/use-workspace'
import { AppError } from '@/lib/errors/app-error'

export function SettingsPage() {
  const auth = useAuth()
  const workspace = useWorkspace()

  return (
    <div className="page-content settings-page">
      <PageHeader
        eyebrow="DO SEU JEITO"
        title="Configurações"
        description="Cuide do seu perfil e organize seu espaço de trabalho."
      />
      {!auth.configured ? (
        <ErrorState
          error={
            new AppError('configuration', 'O Orbit está temporariamente indisponível. Tente novamente em instantes.')
          }
          onRetry={() => window.location.reload()}
        />
      ) : workspace.isError ? (
        <ErrorState error={workspace.error} onRetry={() => void workspace.refetch()} />
      ) : auth.loading || workspace.isPending ? (
        <LoadingState label="Preparando suas configurações…" />
      ) : (
        <div className="settings-sections panel">
          <SettingsProfile profile={workspace.data.profile} email={auth.user?.email} />
          <SettingsCompany workspace={workspace.data.workspace} role={workspace.data.role} />
        </div>
      )}
      <SettingsHelp />
    </div>
  )
}
