import { mkdir, writeFile } from 'node:fs/promises'
import { invitationMessage } from '../supabase/functions/send-invitation/message.ts'
import { invitationDelivery } from '../tests/fixtures/invitation-delivery.ts'

const directory = 'test-results/invitation-design'
await mkdir(directory, { recursive: true })
const scenarios = {
  invitation: invitationDelivery,
  'invitation-long': {
    ...invitationDelivery,
    company_name: 'Estúdio de Estratégia, Design e Comunicação Integrada — Grandes Ideias em Movimento',
    inviter_name: 'Maria Fernanda de Albuquerque e Silva',
    recipient: 'marina.albuquerque.departamento.criativo@example.test',
  },
}
for (const [name, delivery] of Object.entries(scenarios)) {
  const message = invitationMessage(delivery)
  const logo = message.attachments?.[0].content
  const html = message.html.replace('cid:orbit-mark', `data:image/png;base64,${logo}`)
  await writeFile(`${directory}/${name}.html`, html)
}
console.log(`Email previews (test fixtures): ${directory}`)
// Test-only viewport adapter: iframe dimensions simulate email-client widths.
// These measurements are not part of the authored email design.
for (const width of [320, 390]) {
  await writeFile(`${directory}/review-${width}.html`, `<!DOCTYPE html><html lang="pt-BR"><title>Revisão ${width}px</title><iframe title="Convite em ${width}px" src="invitation-long.html" width="${width}" height="1500"></iframe></html>`)
}
