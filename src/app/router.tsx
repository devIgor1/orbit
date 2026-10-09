import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { NotFoundPage } from '@/pages/not-found-page'
export const router = createBrowserRouter([
  { path: '/', lazy: async () => ({ Component: (await import('@/pages/landing-page')).LandingPage }) },
  { path: '/login', lazy: async () => ({ Component: (await import('@/pages/login-page')).LoginPage }) },
  { path: '/signup', lazy: async () => ({ Component: (await import('@/pages/signup-page')).SignupPage }) },
  { path: '/companies', lazy: async () => ({ Component: (await import('@/pages/companies-page')).CompaniesPage }) },
  {
    element: <AppShell />,
    children: [
      { path: '/dashboard', lazy: async () => ({ Component: (await import('@/pages/dashboard-page')).DashboardPage }) },
      { path: '/projects', lazy: async () => ({ Component: (await import('@/pages/projects-page')).ProjectsPage }) },
      {
        path: '/projects/:projectId',
        lazy: async () => ({ Component: (await import('@/pages/project-page')).ProjectPage }),
      },
      { path: '/team', lazy: async () => ({ Component: (await import('@/pages/team-page')).TeamPage }) },
      { path: '/settings', lazy: async () => ({ Component: (await import('@/pages/settings-page')).SettingsPage }) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
