import type { InvitationDelivery } from './contracts.ts'

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
  return {
    from: `"${name}, via Orbit" <${job.sender_email}>`,
    to: [job.recipient],
    reply_to: job.reply_to,
    subject: `Convite para ${company} no Orbit`,
    text: `${introduction}\n\n${instructions}\n\nAceitar convite: ${job.invitation_url}\n\nVálido até ${expiration}.\n\nSe você não esperava este convite, pode ignorar esta mensagem.`,
    html: `<h1>Você recebeu um convite</h1><p>${escapeHtml(introduction)}</p><p>${escapeHtml(instructions)}</p><p><a href="${escapeHtml(job.invitation_url)}">Aceitar convite</a></p><p>Válido até ${escapeHtml(expiration)}.</p><p>Se você não esperava este convite, pode ignorar esta mensagem.</p>`,
  }
}
