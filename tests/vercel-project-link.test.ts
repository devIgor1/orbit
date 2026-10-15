import { describe, expect, it, vi } from 'vitest'
import { loadVercelProjectLink } from '../scripts/vercel-project-link'

const project = {
  id: 'prj_orbitFixture', accountId: 'team_orbitFixture', name: 'orbit',
  link: { type: 'github', org: 'devIgor1', repo: 'orbit' },
}

describe('Vercel project-scoped authentication', () => {
  it('resolves only the requested project without user or team API permissions', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(project))
    await expect(loadVercelProjectLink('test-token', 'orbit', 'devIgor1/orbit', request)).resolves.toEqual({
      projectId: project.id, orgId: project.accountId, projectName: project.name,
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('https://api.vercel.com/v9/projects/orbit', expect.objectContaining({
      headers: { Authorization: 'Bearer test-token' },
    }))
  })

  it.each([401, 403, 404, 500])('fails closed on HTTP %s without including response secrets', async status => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ secret: 'do-not-log' }, { status }))
    await expect(loadVercelProjectLink('test-token', 'orbit', 'devIgor1/orbit', request)).rejects.toThrow(`HTTP ${status}`)
  })

  it.each([
    { ...project, name: 'other-project' },
    { ...project, link: { ...project.link, org: 'another-owner' } },
    { ...project, link: { ...project.link, repo: 'another-repo' } },
    { ...project, link: null },
    { ...project, id: 'invalid' },
  ])('refuses an unconfirmed destination', async response => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json(response))
    await expect(loadVercelProjectLink('test-token', 'orbit', 'devIgor1/orbit', request)).rejects.toThrow('não corresponde')
  })

  it('stops before requesting the API when the token is missing', async () => {
    const request = vi.fn<typeof fetch>()
    await expect(loadVercelProjectLink(undefined, 'orbit', 'devIgor1/orbit', request)).rejects.toThrow('VERCEL_TOKEN')
    expect(request).not.toHaveBeenCalled()
  })

  it('propagates an unavailable API rather than fabricating a project link', async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error('Network unavailable'))
    await expect(loadVercelProjectLink('test-token', 'orbit', 'devIgor1/orbit', request)).rejects.toThrow('Network unavailable')
  })
})
