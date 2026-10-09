import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { OptionsSelect } from '@/components/shared/options-select'
import { changeRoleSchema, memberRoleLabels } from '../schemas/member-management-schema'
import type { MemberDetails, MemberRole } from '../services/member-management-service'

export function MemberRoleForm({ member, busy, isSelf, onSubmit }: {
  member: MemberDetails; busy: boolean; isSelf: boolean; onSubmit: (role: MemberRole) => Promise<void>
}) {
  const { control, handleSubmit } = useForm({ resolver: zodResolver(changeRoleSchema), defaultValues: { role: member.role } })
  const role = useWatch({ control, name: 'role' })
  return <form className="form-stack" onSubmit={handleSubmit(({ role }) => onSubmit(role))}>
    <div className="form-field">
      <label htmlFor="member-role">Nível de acesso</label>
      <Controller name="role" control={control} render={({ field: { onChange, ...field } }) => <OptionsSelect
        {...field} id="member-role" onValueChange={onChange} disabled={busy || member.is_last_admin}
        items={Object.entries(memberRoleLabels).map(([value, label]) => ({ value, label }))} />}
      />
    </div>
    <section className="member-permission-preview" aria-label="Permissões do acesso escolhido" aria-live="polite">
      <ShieldCheck aria-hidden="true" /><div><h3>{memberRoleLabels[role]}</h3>
        <p>{role === 'admin' ? 'Gerencia projetos, convites e acessos da equipe. Também cria e edita tarefas e comentários.'
          : 'Visualiza projetos e equipe, cria e edita tarefas, movimenta o Kanban e comenta. Não gerencia projetos, convites ou acessos.'}</p>
      </div>
    </section>
    {member.is_last_admin && <p className="member-access-notice">Esta pessoa é a única administradora. Promova outra pessoa antes de alterar este acesso ou removê-la.</p>}
    {isSelf && role === 'member' && <p className="member-access-notice">Você deixará de administrar esta empresa assim que salvar.</p>}
    <p className="field-help">A mudança vale para esta empresa. O cargo profissional do perfil permanece independente do nível de acesso.</p>
    <div className="form-actions"><Button type="submit" disabled={busy || member.is_last_admin || role === member.role}>
      {busy ? 'Salvando…' : 'Salvar acesso'}
    </Button></div>
  </form>
}
