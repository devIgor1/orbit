export function safeDestination(path: unknown, fallback = '/dashboard'): string {
  if (typeof path !== 'string' || /[\\\r\n]/.test(path) || path.includes('//')) return fallback
  return /^\/(dashboard|projects|team|settings|companies)(\/|\?|$)/.test(path) ? path : fallback
}

export function loginRedirectPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state) || typeof state.from !== 'string') return '/dashboard'
  const path = state.from
  return safeDestination(path)
}
