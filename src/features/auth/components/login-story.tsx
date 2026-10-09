import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { ProductPreview } from '@/components/shared/product-preview'
import { LoginBenefits } from './login-benefits'

export function LoginStory() {
  return (
    <section className="login-story" aria-label="Orbit, gestão para equipes criativas">
      <div className="login-story-brand">
        <Brand to="/" />
      </div>
      <div className="login-story-main">
        <div className="login-story-content">
          <span className="login-eyebrow">
            <Sparkles aria-hidden="true" /> ESPAÇO PARA SUAS IDEIAS
          </span>
          <h1>
            Grandes ideias.
            <br />
            Na mesma órbita.
          </h1>
          <p>Do primeiro esboço à última entrega. Seus projetos, suas tarefas e sua equipe em um só lugar.</p>
        </div>
        <figure className="login-product-showcase">
          <ProductPreview
            src="/product/board.png"
            alt="Quadro Kanban do Orbit com tarefas de demonstração organizadas por etapa, prioridade e responsável."
            label="seu próximo projeto"
            priority
          />
          <figcaption>
            <span>Clareza para criar. Espaço para crescer.</span>
            <span>Dados de demonstração</span>
          </figcaption>
        </figure>
        <LoginBenefits />
      </div>
      <div className="login-story-footer">
        <span>Feito para quem cria.</span>
        <span>
          Mais conexão. Mais possibilidades. <ArrowUpRight aria-hidden="true" />
        </span>
      </div>
    </section>
  )
}
