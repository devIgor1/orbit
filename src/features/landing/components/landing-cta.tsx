import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Brand } from '@/components/layout/brand'
import { PointerRevealSurface } from '@/components/shared/pointer-reveal-surface'

export function LandingCta() {
  return (
    <section className="landing-section landing-cta" aria-labelledby="landing-cta-title">
      <div className="landing-container">
        <div className="landing-cta-frame">
          <PointerRevealSurface className="landing-cta-panel">
            <img
              className="landing-cta-landscape"
              src="/images/aceternity-landscape.webp"
              width="1672"
              height="941"
              alt=""
              loading="lazy"
            />
            <div className="landing-cta-dither" aria-hidden="true" />
            <div className="landing-cta-shade" aria-hidden="true" />
            <Brand to="/" />
            <div className="landing-cta-content">
              <h2 id="landing-cta-title">Dê espaço à sua próxima grande ideia.</h2>
              <div className="landing-cta-actions">
                <Button asChild className="landing-action">
                  <Link to="/signup">
                    Criar minha conta <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="landing-action">
                  <a href="#produto">Explorar o Orbit</a>
                </Button>
              </div>
            </div>
          </PointerRevealSurface>
        </div>
      </div>
    </section>
  )
}
