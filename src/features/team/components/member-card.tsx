import { CheckCheck, ListTodo, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import type { TeamMember } from '@/lib/supabase/database.types'
import type { ReactNode } from 'react'

export function MemberCard({ member, isSelf, actions }: { member: TeamMember; isSelf: boolean; actions?: ReactNode }) {
  return <article className="member-card">
    <div className="member-card-top"><Avatar name={member.full_name} src={member.avatar_url} /><div className="member-card-actions"><span className="member-role" data-role={member.role}>{member.role === 'admin' && <ShieldCheck />}{member.role === 'admin' ? 'Admin' : 'Colaborador'}</span>{actions}</div></div>
    <h3>{member.full_name}{isSelf && <span className="member-self">você</span>}</h3>
    <p className="member-title">{member.job_title || 'Cargo não informado'}</p>
    <div className="member-workload"><span><ListTodo /><strong>{member.assigned_tasks}</strong> em aberto</span><span><CheckCheck /><strong>{member.completed_tasks}</strong> concluídas</span></div>
  </article>
}
