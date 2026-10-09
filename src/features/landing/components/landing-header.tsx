import { useRef, useState } from 'react'
import { ArrowUpRight, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { landingNavigation } from '../landing-navigation'
import { useLandingNavigation } from '../hooks/use-landing-navigation'

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const { activeSection, scrolled } = useLandingNavigation(headerRef)

  return (
    <header ref={headerRef} className="landing-header" data-scrolled={scrolled}>
      <div className="landing-container landing-header-inner">
        <Brand to="/" />
        <nav className="landing-nav" aria-label="Navegação da página">
          {landingNavigation.map((item) => (
            <a key={item.href} href={item.href} aria-current={activeSection === item.id ? 'location' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="landing-header-actions">
          <Button asChild className="landing-header-login">
            <Link to="/login">
              Acessar workspace <ArrowUpRight />
            </Link>
          </Button>
          <Sheet
            open={menuOpen}
            onOpenChange={setMenuOpen}
            title="Explore o Orbit"
            trigger={
              <Button variant="ghost" size="icon" className="landing-menu-trigger" aria-label="Abrir menu">
                <Menu />
              </Button>
            }
          >
            <nav className="landing-mobile-nav" aria-label="Navegação mobile">
              {landingNavigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={activeSection === item.id ? 'location' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                  <ArrowUpRight />
                </a>
              ))}
              <Button asChild>
                <Link to="/login" onClick={() => setMenuOpen(false)}>
                  Acessar workspace <ArrowUpRight />
                </Link>
              </Button>
            </nav>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
