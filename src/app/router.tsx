import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { NotFoundPage } from '@/pages/not-found-page'
export const router = createBrowserRouter([
      { path: '/login', lazy: async () => ({ Component: (await import('@/pages/login-page')).LoginPage }) },
  { element: <AppShell />, children: [
      { path: '/settings', lazy: async () => ({ Component: (await import('@/pages/settings-page')).SettingsPage }) },
      { path: '/team', lazy: async () => ({ Component: (await import('@/pages/team-page')).TeamPage }) },
      { path: '/projects', lazy: async () => ({ Component: (await import('@/pages/projects-page')).ProjectsPage }) },
      { path: '/projects/:projectId', lazy: async () => ({ Component: (await import('@/pages/project-page')).ProjectPage }) },
      { path: '*', element: <NotFoundPage /> },
  ] },
])
