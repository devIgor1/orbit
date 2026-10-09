import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DashboardHero({ name, workspaceName }: { name?: string; workspaceName?: string }) {
  return (
    <section className="dashboard-hero" aria-labelledby="dashboard-welcome">
      <img className="dashboard-landscape" src="/images/aceternity-landscape.webp" alt="" width="1672" height="941" />
      <div className="dashboard-welcome">
        <p className="dashboard-workspace-label">
          <span />
          {workspaceName ?? 'Seu espaço de criação'}
        </p>
        <h2 id="dashboard-welcome">
          {name ? `Olá, ${name.split(' ')[0]}.` : 'Boas ideias começam aqui.'}
          <br />
          Dê forma ao próximo passo.
        </h2>
        <p>Ideias conectadas. Trabalho em movimento.</p>
      </div>
      <Link className="dashboard-continue" to="/projects">
        <span>
          Da ideia à entrega<strong>Explorar projetos</strong>
        </span>
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </section>
  )
}
