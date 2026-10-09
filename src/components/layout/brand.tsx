import { Orbit } from 'lucide-react'
import { Link } from 'react-router-dom'
export function Brand({ to = '/dashboard' }: { to?: string }) {
  return (
    <Link className="brand" to={to} aria-label="Orbit — início">
      <span className="brand-mark">
        <Orbit />
      </span>
      <span>
        orbit<span className="brand-period">.</span>
      </span>
    </Link>
  )
}
