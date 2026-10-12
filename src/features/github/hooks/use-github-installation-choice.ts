import { useMutation } from '@tanstack/react-query'
import { selectGithubInstallation } from '../services/github-discovery'

export function useGithubInstallationChoice(state: string) {
  return useMutation({
    mutationFn: (installationId: number | null) => selectGithubInstallation(state, installationId),
    retry: false,
    onSuccess: ({ url }) => window.location.assign(url),
  })
}
