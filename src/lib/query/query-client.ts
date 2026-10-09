import { QueryClient } from '@tanstack/react-query'
import { AppError } from '@/lib/errors/app-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failures, error) => !(error instanceof AppError && ['configuration', 'permission', 'authentication', 'contract'].includes(error.kind)) && failures < 1,
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})
