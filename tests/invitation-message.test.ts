// @vitest-environment node
import { createHash } from 'node:crypto'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { deliverySchema } from '../supabase/functions/send-invitation/contracts'
import { invitationMessage } from '../supabase/functions/send-invitation/message'
import { invitationDelivery as job } from './fixtures/invitation-delivery'

describe('Template de convite do Orbit', () => {
  it('preserva o payload legado para reenvios idempotentes anteriores à publicação', () => {
    const message = invitationMessage({ ...job, template_version: 1 })
    expect(createHash('sha256').update(JSON.stringify(message)).digest('hex'))
      .toBe('a0b91092e75e79dd3936a0bf5d84e600525b30636c89bd596285c968a083697e')
  })

  it('entrega ação, link alternativo, destinatário e validade em HTML e texto', () => {
    const message = invitationMessage(job)
    const document = new JSDOM(message.html).window.document
    expect(document.documentElement.lang).toBe('pt-BR')
    expect([...document.querySelectorAll('a')].map(link => link.href))
      .toEqual([job.invitation_url, job.invitation_url])
    expect(document.querySelector('h1')?.textContent).toContain('Você tem um lugar')
    for (const content of [job.recipient, job.company_name, '20 de outubro de 2026']) {
      expect(document.body.textContent).toContain(content)
      expect(message.text).toContain(content)
    }
    expect(message.reply_to).toBe(job.reply_to)
    expect(document.querySelectorAll('style, script, link')).toHaveLength(0)
    expect(message.html).not.toContain('var(')
    expect(document.querySelector('img')?.src).toBe('cid:orbit-mark')
    expect(message.attachments?.[0].content_id).toBe('orbit-mark')
    expect(Buffer.from(message.attachments?.[0].content ?? '', 'base64').subarray(1, 4).toString()).toBe('PNG')
    expect(document.querySelectorAll('table:not([role="presentation"])')).toHaveLength(0)
  })

  it('trata nomes como texto e não reinterpreta marcadores inseridos pelo usuário', () => {
    const company = '<img src=x onerror=alert(1)> & {{invitationUrl}}'
    const message = invitationMessage({ ...job, company_name: company, inviter_name: 'Igor\r\nBcc: vítima' })
    const document = new JSDOM(message.html).window.document
    expect(document.querySelector('h2')?.textContent).toBe(company)
    expect(document.querySelectorAll('img')).toHaveLength(1)
    expect(document.querySelector('[onerror]')).toBeNull()
    expect(message.from).not.toMatch(/[\r\n]/)
    expect(message.html).toContain('&lt;img')
  })

  it('reconhece entregas antigas sem versão e recusa versões desconhecidas', () => {
    const legacy = { ...job, template_version: undefined }
    expect(deliverySchema.parse(legacy).template_version).toBe(1)
    expect(deliverySchema.safeParse({ ...job, template_version: 99 }).success).toBe(false)
  })
})
