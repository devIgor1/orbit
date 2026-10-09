import { Brand } from '@/components/layout/brand'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { landingNavigation } from '../landing-navigation'

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-container landing-footer-inner">
        <div className="landing-footer-brand">
          <Brand to="/" />
          <p>
            Projetos, pessoas e boas ideias.
            <br /> Sempre na mesma órbita.
          </p>
        </div>
        <nav className="landing-footer-nav" aria-label="Navegação do rodapé">
          <p>Conheça o Orbit</p>
          {landingNavigation.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <nav className="landing-footer-nav" aria-label="Seu workspace">
          <p>Seu próximo projeto</p>
          <Link to="/login">
            Acessar workspace <ArrowUpRight aria-hidden="true" />
          </Link>
          <a href="#duvidas">Acesso e primeiros passos</a>
        </nav>
      </div>
      <div className="landing-container landing-footer-bottom">
        <span>Orbit · Feito para quem cria.</span>
        <a href="#landing-content">
          De volta ao início <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
    </footer>
  )
}
