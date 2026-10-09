import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { NotFoundPage } from '@/pages/not-found-page'
export const router = createBrowserRouter([
      { path: '/login', lazy: async () => ({ Component: (await import('@/pages/login-page')).LoginPage }) },
  { element: <AppShell />, children: [
      { path: '/settings', lazy: async () => ({ Component: (await import('@/pages/settings-page')).SettingsPage }) },
      { path: '*', element: <NotFoundPage /> },
  ] },
])
