import { ArrowDown, ArrowRight, ArrowUpRight, Aperture, Boxes, Layers3, PenTool } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ProductPreview } from '@/components/shared/product-preview'
import { LandingLandscape } from './landing-landscape'

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <LandingLandscape />
      <div className="landing-container">
        <div className="landing-hero-copy">
          <a className="landing-announcement" href="#produto">
            <span>Orbit</span> Seu espaço para criar, conectado. <ArrowRight aria-hidden="true" />
          </a>
          <h1 id="landing-title">
            <span className="landing-hero-line">
              <span>Grandes</span> <span>ideias.</span>
            </span>{' '}
            <br />
            <span className="landing-hero-line">
              <span>Na</span> <span>mesma</span> <span>órbita.</span>
            </span>
          </h1>
          <p>
            Conecte pessoas, projetos e próximos passos.
            <br /> Menos ruído para sua equipe. Mais espaço para criar.
          </p>
          <div className="landing-hero-actions">
            <Button asChild className="landing-action">
              <Link to="/signup">
                Criar minha conta <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="outline" className="landing-action">
              <a href="#recursos">
                Conhecer os recursos <ArrowDown />
              </a>
            </Button>
          </div>
          <span className="landing-hero-note">Projetos, tarefas e equipe. Um espaço para tudo acontecer.</span>
        </div>
        <div className="landing-hero-perspective">
          <figure className="landing-hero-product">
            <ProductPreview
              src="/product/dashboard.png"
              alt="Dashboard do Orbit com projetos ativos, tarefas, evolução semanal e atividades do workspace de demonstração."
              label="visão geral"
              priority
            />
            <figcaption>
              Uma visão clara de tudo o que está em movimento. <span>Interface real · Dados de demonstração</span>
            </figcaption>
          </figure>
        </div>
        <div className="landing-audience">
          <p>Para equipes que transformam ideias em entregas.</p>
          <ul aria-label="Feito para equipes criativas">
            <li>
              <Aperture aria-hidden="true" /> Estúdios
            </li>
            <li>
              <Layers3 aria-hidden="true" /> Agências
            </li>
            <li>
              <PenTool aria-hidden="true" /> Designers
            </li>
            <li>
              <Boxes aria-hidden="true" /> Times de produto
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
