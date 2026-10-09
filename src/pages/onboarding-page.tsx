import { useIsMutating } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { AccountHeader } from '@/components/layout/account-header'
import { ConnectionState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useAuth } from '@/features/auth/use-auth'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { OnboardingFlow } from '@/features/onboarding/components/onboarding-flow'

export function OnboardingPage() {
  const auth = useAuth()
  const logout = useSignOut()
  const navigate = useNavigate()
  const creating = useIsMutating({ mutationKey: ['onboarding-company'] }) > 0
  const inviting = useIsMutating({ mutationKey: ['manage-invitations'] }) > 0
  if (auth.loading) return <LoadingState label="Preparando seu primeiro acesso…" />
  if (!auth.configured) return <ConnectionState />
  if (!auth.user) return <Navigate to="/login?next=%2Fonboarding" replace />
  return (
    <main className="onboarding-page">
      <AccountHeader email={auth.user.email} busy={logout.pending || creating || inviting}
        onSignOut={() => void logout.signOut()} />
      <div className="onboarding-content">
        {Boolean(logout.error) && <ErrorState error={logout.error} />}
        <OnboardingFlow onFinish={() => navigate('/dashboard', { replace: true })} />
      </div>
    </main>
  )
}
