import { z } from 'zod'
import { invokeGithub } from './github-api'

const connectionUrl = z.url().refine((value) => {
  const url = new URL(value)
  return (
    url.origin === 'https://github.com' &&
    (url.pathname === '/login/oauth/authorize' || /^\/apps\/[a-z0-9-]+\/installations\/new$/.test(url.pathname))
  )
})
const installationSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  accountLogin: z.string().min(1),
  accountType: z.enum(['User', 'Organization']),
})
export type GithubInstallation = z.infer<typeof installationSchema>
export const discoverGithubInstallations = (state: string, code: string) =>
  invokeGithub(
    { action: 'discovery-callback', state, code },
    z.discriminatedUnion('status', [
      z.object({ status: z.literal('redirect'), url: connectionUrl }),
      z.object({
        status: z.literal('choose'),
        state: z.string().min(32).max(128),
        installations: z.array(installationSchema).min(1).max(1000),
      }),
    ]),
  )
export const selectGithubInstallation = (state: string, installationId: number | null) =>
  invokeGithub({ action: 'select-installation', state, installationId }, z.object({ url: connectionUrl }))
