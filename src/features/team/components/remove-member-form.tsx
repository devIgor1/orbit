import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionsSelect } from '@/components/shared/options-select'
import { removeMemberSchema } from '../schemas/member-management-schema'
import type { MemberDetails } from '../services/member-management-service'
import type { TeamMember } from '@/lib/supabase/database.types'

export function RemoveMemberForm({ member, members, busy, isSelf, onSubmit }: {
  member: MemberDetails; members: TeamMember[]; busy: boolean; isSelf: boolean; onSubmit: (replacement: string | null) => Promise<void>
}) {
  const { control, handleSubmit } = useForm({ resolver: zodResolver(removeMemberSchema), defaultValues: { replacement: '' } })
  return <form className="form-stack" onSubmit={handleSubmit(({ replacement }) => onSubmit(replacement || null))}>
    <section className="member-removal-summary" aria-label="Impacto da remoção">
      <UserMinus aria-hidden="true" /><div><h3>Remover {member.full_name} da empresa</h3>
        <p>O acesso será encerrado. Projetos, comentários e histórico serão preservados, assim como a conta e o acesso a outras empresas.</p>
      </div>
    </section>
    <p><strong>{member.pending_tasks}</strong> {member.pending_tasks === 1 ? 'tarefa pendente atribuída a esta pessoa.' : 'tarefas pendentes atribuídas a esta pessoa.'}</p>
    {member.pending_tasks > 0 && <div className="form-field">
      <label htmlFor="member-replacement">Destino das tarefas pendentes</label>
      <Controller name="replacement" control={control} render={({ field: { onChange, ...field } }) => <OptionsSelect
        {...field} id="member-replacement" onValueChange={onChange} disabled={busy || member.is_last_admin}
        items={[{ value: '', label: 'Deixar sem responsável' }, ...members.filter(person => person.id !== member.user_id && person.is_active)
          .map(person => ({ value: person.id, label: person.full_name }))]} />}
      />
      <p className="field-help">Tarefas concluídas mantêm a atribuição histórica. Se forem reabertas, ficam sem responsável até uma nova atribuição.</p>
    </div>}
    {member.is_last_admin && <p className="member-access-notice">A empresa precisa de pelo menos um administrador. Promova outra pessoa antes de remover este acesso.</p>}
    {isSelf && !member.is_last_admin && <p className="member-access-notice">Você está removendo seu próprio acesso e sairá desta empresa após confirmar.</p>}
    <div className="form-actions"><Button type="submit" variant="destructive" disabled={busy || member.is_last_admin}>
      {busy ? 'Removendo…' : 'Remover da empresa'}
    </Button></div>
  </form>
}
