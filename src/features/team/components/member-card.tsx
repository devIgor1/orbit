import { CheckCheck, ListTodo, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import type { TeamMember } from '@/lib/supabase/database.types'

export function MemberCard({ member, isSelf }: { member: TeamMember; isSelf: boolean }) {
  return <article className="member-card">
    <div className="member-card-top"><Avatar name={member.full_name} src={member.avatar_url} /><span className="member-role" data-role={member.role}>{member.role === 'admin' && <ShieldCheck />}{member.role === 'admin' ? 'Admin' : 'Membro'}</span></div>
    <h3>{member.full_name}{isSelf && <span className="member-self">você</span>}</h3>
    <p className="member-title">{member.job_title || 'Cargo não informado'}</p>
    <div className="member-workload"><span><ListTodo /><strong>{member.assigned_tasks}</strong> em aberto</span><span><CheckCheck /><strong>{member.completed_tasks}</strong> concluídas</span></div>
  </article>
}
