import { Link } from 'react-router-dom'
import { Orbit } from 'lucide-react'
import { Button } from '@/components/ui/button'
export function NotFoundPage() { return <div className="not-found-page"><Orbit /><span className="eyebrow">404 · FORA DE ÓRBITA</span><h1>Essa ideia ainda não chegou aqui.</h1><p>A página que você procura não foi encontrada.</p><Button asChild><Link to="/dashboard">Voltar à visão geral</Link></Button></div> }
