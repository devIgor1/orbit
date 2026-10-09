export function loginRedirectPath(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state) || typeof state.from !== 'string') return '/dashboard'
  const path = state.from
  return /^\/(dashboard|projects|team|settings)(\/|\?|$)/.test(path) && !path.includes('//') ? path : '/dashboard'
}
