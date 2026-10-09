import type { InvitationDelivery } from './contracts.ts'
import { invitationHtmlV2, invitationLogoV2 } from './invitation-v2.generated.ts'

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return entities[character]
  })
}

export function invitationMessage(job: InvitationDelivery) {
  const name = job.inviter_name.replace(/[\r\n"<>\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
  const company = job.company_name.replace(/[\r\n]/g, ' ').trim()
  const expiration = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'America/Sao_Paulo' })
    .format(new Date(job.expires_at))
  const introduction = `${name} convidou você para participar da empresa ${company} no Orbit.`
  const instructions = `Entre ou crie sua conta usando ${job.recipient} para aceitar o convite e acessar o Kanban da equipe.`
  // Preserve v1 byte-for-byte for retries with an existing Resend idempotency key.
  const legacy = {
    from: `"${name}, via Orbit" <${job.sender_email}>`,
    to: [job.recipient],
    reply_to: job.reply_to,
    subject: `Convite para ${company} no Orbit`,
    text: `${introduction}\n\n${instructions}\n\nAceitar convite: ${job.invitation_url}\n\nVálido até ${expiration}.\n\nSe você não esperava este convite, pode ignorar esta mensagem.`,
    html: `<h1>Você recebeu um convite</h1><p>${escapeHtml(introduction)}</p><p>${escapeHtml(instructions)}</p><p><a href="${escapeHtml(job.invitation_url)}">Aceitar convite</a></p><p>Válido até ${escapeHtml(expiration)}.</p><p>Se você não esperava este convite, pode ignorar esta mensagem.</p>`,
  }
  if (job.template_version === 1) return legacy
  const fields: Record<string, string> = {
    inviterName: name, companyName: company, recipient: job.recipient,
    invitationUrl: job.invitation_url, expiration,
  }
  return {
    ...legacy,
    text: `${legacy.text}\n\nTem alguma dúvida? Responda a este e-mail para falar com quem convidou você.\n\nOrbit — Menos ruído. Mais criação.`,
    html: invitationHtmlV2.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (!(key in fields)) throw new Error('Unknown invitation template field')
      return escapeHtml(fields[key])
    }),
    attachments: [{ filename: 'orbit.png', content: invitationLogoV2, content_type: 'image/png', content_id: 'orbit-mark' }],
  }
}
