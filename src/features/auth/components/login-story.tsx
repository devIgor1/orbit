import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { LoginBenefits } from './login-benefits'
import { LoginProductShowcase } from './login-product-showcase'

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
          <LoginBenefits />
        </div>
        <div className="login-preview-slot">
          <LoginProductShowcase />
        </div>
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
