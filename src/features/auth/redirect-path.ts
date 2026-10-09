export function safeDestination(path: unknown, fallback = '/dashboard'): string {
  if (typeof path !== 'string' || /[\\\r\n]/.test(path) || path.includes('//')) return fallback
  return /^\/(dashboard|projects|team|settings|companies|onboarding)(\/|\?|$)/.test(path) ? path : fallback
}

// Independent signups always start setup. Invited collaborators keep their
// invitation instead of being asked to create a separate company.
export function signupDestination(path: unknown): string {
  const destination = new URL(safeDestination(path, '/onboarding'), 'https://orbit.invalid')
  if (destination.pathname === '/companies' && destination.searchParams.get('invitation'))
    return destination.pathname + destination.search
  return '/onboarding'
}

export function loginRedirectPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state) || typeof state.from !== 'string') return '/dashboard'
  const path = state.from
  return safeDestination(path)
}
