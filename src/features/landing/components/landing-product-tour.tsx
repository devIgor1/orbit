import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductPreview } from '@/components/shared/product-preview'
import { LandingSectionHeading } from './landing-section-heading'

// Presentation metadata for screenshots, never a substitute for workspace records.
const views = [
  {
    title: 'Um quadro. Todas as próximas entregas.',
    label: 'Kanban',
    src: '/product/board.png',
    alt: 'Quadro Kanban real do Orbit com tarefas de demonstração distribuídas por etapa.',
    description: 'Da ideia ao concluído, acompanhe o caminho de cada tarefa e mantenha o trabalho em movimento.',
    details: ['Etapas visíveis', 'Responsáveis definidos', 'Prioridades e prazos'],
  },
  {
    title: 'As pessoas por trás das boas ideias.',
    label: 'Equipe',
    src: '/product/team.png',
    alt: 'Diretório real da equipe do Orbit com membros e suas cargas de tarefas de demonstração.',
    description: 'Encontre os membros do workspace e acompanhe a distribuição do trabalho entre as pessoas.',
    details: ['Diretório da equipe', 'Tarefas atribuídas', 'Perfil pessoal'],
  },
  {
    title: 'O panorama para seguir em frente.',
    label: 'Visão geral',
    src: '/product/dashboard.png',
    alt: 'Visão geral real do Orbit com indicadores, gráficos e atividades do workspace de demonstração.',
    description: 'Projetos, pendências e evolução semanal reunidos para você entender o ritmo das entregas.',
    details: ['Indicadores por período', 'Evolução das tarefas', 'Atividades recentes'],
  },
]

export function LandingProductTour() {
  const [index, setIndex] = useState(0)
  const view = views[index]
  const changeView = (direction: number) => setIndex((current) => (current + direction + views.length) % views.length)

  return (
    <section
      id="produto"
      className="landing-section landing-tour"
      aria-label="Por dentro do Orbit"
      aria-roledescription="carrossel"
    >
      <div className="landing-container">
        <LandingSectionHeading
          actions={
            <div className="landing-tour-controls">
              <span className="landing-tour-counter" role="status" aria-live="polite">
                <span className="sr-only">{view.label}, visualização </span>0{index + 1}
                <span> / 0{views.length}</span>
              </span>
              <Button variant="outline" size="icon" onClick={() => changeView(-1)} aria-label="Visualização anterior">
                <ArrowLeft />
              </Button>
              <Button variant="outline" size="icon" onClick={() => changeView(1)} aria-label="Próxima visualização">
                <ArrowRight />
              </Button>
            </div>
          }
        >
          Uma visão para cada
          <br /> <span>momento do trabalho.</span>
        </LandingSectionHeading>
        <div
          className="landing-tour-stage"
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} de ${views.length}: ${view.label}`}
        >
          <ProductPreview src={view.src} alt={view.alt} label={view.label.toLowerCase()} />
          <div className="landing-tour-caption">
            <div>
              <h3>{view.title}</h3>
              <p>{view.description}</p>
            </div>
            <ul>
              {view.details.map((detail) => (
                <li key={detail}>
                  <Check />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="landing-feature-caption">Telas reais do Orbit · Dados de demonstração</p>
      </div>
    </section>
  )
}
