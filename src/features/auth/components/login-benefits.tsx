import { FolderKanban, ListChecks, Users } from 'lucide-react'

const benefits = [
  { icon: FolderKanban, title: 'Projetos no lugar', description: 'Objetivos, prazos e progresso.' },
  { icon: ListChecks, title: 'Próximos passos claros', description: 'Tarefas, etapas e prioridades.' },
  { icon: Users, title: 'Equipe conectada', description: 'Responsáveis e contexto juntos.' },
]

export function LoginBenefits() {
  return (
    <ul className="login-benefits" aria-label="O que você encontra no Orbit">
      {benefits.map(({ icon: Icon, title, description }) => (
        <li key={title}>
          <span className="login-benefit-icon">
            <Icon aria-hidden="true" />
          </span>
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
