import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
import type { TeamMember } from '@/lib/supabase/database.types'
import { useTaskComments, useAddComment } from '../hooks/use-tasks'

const commentSchema = z.object({ body: z.string().trim().min(1, 'Escreva um comentário.').max(3000, 'Use até 3.000 caracteres.') })

export function TaskComments({ taskId, members }: { taskId: string; members: TeamMember[] }) {
  const comments = useTaskComments(taskId)
  const addComment = useAddComment(taskId)
  const id = useId()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof commentSchema>>({ resolver: zodResolver(commentSchema), defaultValues: { body: '' } })

  async function submit({ body }: z.infer<typeof commentSchema>) {
    try {
      await addComment.mutateAsync(body)
      reset()
    } catch { /* Keep the draft and expose the backend error. */ }
  }

  return <div className="task-discussion">
    {comments.isError ? <ErrorState error={comments.error} onRetry={() => void comments.refetch()} /> : comments.isPending ? <LoadingState label="Carregando comentários…" /> : comments.data.length === 0 ? <EmptyState title="A conversa começa aqui" description="Compartilhe uma ideia, uma atualização ou um feedback com sua equipe." /> : <ul className="comment-list">
      {comments.data.map(comment => {
        const author = members.find(member => member.id === comment.author_id)
        const name = author?.full_name ?? 'Membro do workspace'
        return <li className="comment-item" key={comment.id}>
          <Avatar name={name} src={author?.avatar_url ?? undefined} />
          <div className="comment-content"><div className="comment-author"><strong>{name}</strong><time className="comment-date" dateTime={comment.created_at}>{formatDate(comment.created_at, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div><p className="comment-body">{comment.body}</p></div>
        </li>
      })}
    </ul>}
    <form className="comment-composer" onSubmit={handleSubmit(submit)}>
      <label className="form-label" htmlFor={id}>Adicionar comentário</label>
      <Textarea id={id} placeholder="Deixe sua equipe por dentro…" rows={3} aria-invalid={!!errors.body} {...register('body')} />
      {errors.body && <p className="form-error">{errors.body.message}</p>}
      {addComment.error && <ErrorState error={addComment.error} />}
      <Button type="submit" size="sm" disabled={addComment.isPending}><Send aria-hidden="true" />{addComment.isPending ? 'Enviando…' : 'Enviar comentário'}</Button>
    </form>
  </div>
}
