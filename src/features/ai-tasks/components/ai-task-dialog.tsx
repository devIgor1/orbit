import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/shared/query-state'
import { aiTaskRequestSchema } from '../schemas/ai-task-schema'
import { useAiTask } from '../hooks/use-ai-task'
import { aiTaskRejectionMessages } from '../ai-task-messages'
import { AiTaskQuotaError } from '../services/ai-task-quota-error'
import { AiTaskQuotaNotice } from './ai-task-quota-notice'

const promptSchema = aiTaskRequestSchema.pick({ prompt: true })
type Props = {
  open: boolean
  projectId: string
  projectTitle: string
  onOpenChange: (open: boolean) => void
  onOpenTask: (id: string) => void
}

export function AiTaskDialog({ open, projectId, projectTitle, onOpenChange, onOpenTask }: Props) {
  const id = useId()
  const mutation = useAiTask(projectId)
  const form = useForm<{ prompt: string }>({ resolver: zodResolver(promptSchema), defaultValues: { prompt: '' } })
  const result = mutation.isSuccess ? mutation.data.result : undefined
  const pending = mutation.isPending || form.formState.isSubmitting
  function changeOpen(value: boolean) { if (!pending) onOpenChange(value) }
  async function submit({ prompt }: { prompt: string }) {
    if (pending) return
    try { await mutation.mutateAsync(prompt) } catch { /* Keep the text and render the confirmed mutation error. */ }
  }
  function startAnother() {
    mutation.newRequest()
    form.reset({ prompt: '' })
  }

  return <Dialog open={open} onOpenChange={changeOpen} title="Uma tarefa, nas suas palavras"
    description="Descreva o trabalho. A IA cuida do cadastro no projeto.">
    {result?.kind === 'created' ? <div className="ai-task-success">
      <div className="ai-task-result" role="status"><CheckCircle2 aria-hidden="true" /><div>
        <p className="ai-task-result-label">Tarefa criada</p><h3>{result.task.title}</h3>
        <p>A tarefa já está salva no projeto.</p>
      </div></div>
      <div className="form-actions">
        <Button variant="outline" onClick={startAnother}>Criar outra</Button>
        <Button autoFocus onClick={() => { onOpenChange(false); onOpenTask(result.task.id) }}>Abrir tarefa</Button>
      </div>
    </div> : <form className="form-stack" onSubmit={form.handleSubmit(submit)} noValidate aria-busy={pending}>
      <div className="ai-task-context"><Sparkles aria-hidden="true" /><div><strong>{projectTitle}</strong><p>Uma tarefa por pedido. Inclua a prioridade e, se quiser, o responsável e o prazo.</p></div></div>
      <div className="form-field">
        <label className="form-label" htmlFor={id}>O que precisa ser feito?</label>
        <Textarea autoFocus id={id} rows={6} maxLength={3000} disabled={pending}
          placeholder="Crie uma tarefa para revisar a versão mobile do checkout, com prioridade alta e entrega na próxima sexta-feira."
          aria-invalid={Boolean(form.formState.errors.prompt)} aria-describedby={`${id}-help${form.formState.errors.prompt ? ` ${id}-error` : ''}`}
          {...form.register('prompt')} />
        <p className="ai-task-help" id={`${id}-help`}>Seu pedido, o nome do projeto e os nomes dos membros serão enviados à OpenAI. A tarefa será criada em A fazer.</p>
        {form.formState.errors.prompt && <p className="form-error" id={`${id}-error`}>Descreva a tarefa usando entre 10 e 3.000 caracteres.</p>}
      </div>
      {result?.kind === 'clarification' && <div className="ai-task-clarification" role="status"><p>{result.message}</p><p>Complete o texto acima e envie novamente.</p></div>}
      {result?.kind === 'rejected' && <div className="ai-task-clarification" role="status"><p>{aiTaskRejectionMessages[result.reason]}</p><p>Revise o texto acima para solicitar o cadastro de uma tarefa.</p></div>}
      {mutation.isError && (mutation.error instanceof AiTaskQuotaError
        ? <AiTaskQuotaNotice error={mutation.error} /> : <ErrorState error={mutation.error} />)}
      <div className="form-actions">
        <Button type="button" variant="outline" disabled={pending} onClick={() => changeOpen(false)}>Fechar</Button>
        <Button type="submit" disabled={pending}><Sparkles aria-hidden="true" />{pending ? 'Criando tarefa…' : 'Criar tarefa com IA'}</Button>
      </div>
      <span className="sr-only" role="status">{pending ? 'Interpretando seu pedido e salvando a tarefa. Aguarde.' : ''}</span>
    </form>}
  </Dialog>
}
