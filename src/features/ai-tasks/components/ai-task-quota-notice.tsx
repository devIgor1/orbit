import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import type { AiTaskQuotaError } from '../services/ai-task-quota-error'
import { formatQuotaWait } from '../format-quota-wait'

export function AiTaskQuotaNotice({ error }: { error: AiTaskQuotaError }) {
  const [now, setNow] = useState(() => Date.now())
  const remaining = Math.max(0, Math.ceil((error.retryAt - now) / 1000))
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [error])

  return <div className="ai-task-quota" role="alert">
    <h3><CircleAlert aria-hidden="true" />Limite de IA atingido</h3>
    <ul>{error.quota.blocked.map(limit => <li key={`${limit.scope}:${limit.windowSeconds}`}>
      <strong>{limit.scope === 'user' ? 'Seu usuário' : 'Sua empresa'}:</strong>{' '}
      {limit.used} de {limit.limit} tentativas {limit.windowSeconds === 600 ? 'nos últimos 10 minutos' : 'nas últimas 24 horas'}.
    </li>)}</ul>
    <p role="timer" aria-live="off">{remaining > 0
      ? `Nova tentativa estimada em ${formatQuotaWait(remaining)}.`
      : 'Prazo estimado encerrado. Envie novamente para verificar a disponibilidade.'}</p>
    <p>Falhas, recusas e pedidos de esclarecimento também contam. Esta tentativa bloqueada não consumiu a cota.</p>
    <p>O uso em outras abas ou por colegas pode alterar a espera. Você pode criar a tarefa manualmente em Nova tarefa.</p>
  </div>
}
