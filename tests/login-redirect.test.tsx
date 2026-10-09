import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/pages/login-page'
import { AuthContext } from '@/features/auth/auth-context'
import { loginRedirectPath } from '@/features/auth/redirect-path'
import { testAuth } from './test-providers'

describe('Retorno após autenticação', () => {
  it('restaura o projeto solicitado depois da confirmação da sessão', async () => {
    render(<AuthContext.Provider value={testAuth}><MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/projects/project-1?view=list' } }]}><Routes><Route path="/login" element={<LoginPage />} /><Route path="/projects/:projectId" element={<h1>Projeto solicitado</h1>} /></Routes></MemoryRouter></AuthContext.Provider>)
    expect(await screen.findByRole('heading', { name: 'Projeto solicitado' })).toBeVisible()
  })

  it.each(['https://example.com', '//example.com', '/projects//example.com', '/admin', '/dashboard-elsewhere'])('não permite retorno externo ou rota não autorizada: %s', (from) => {
    expect(loginRedirectPath({ from })).toBe('/dashboard')
  })
})
