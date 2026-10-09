import { Grid2X2, List, Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { projectStatusLabels } from '../schemas/project-schema'

type ProjectsToolbarProps = {
  search: string
  status: string
  view: 'grid' | 'list'
  onSearchChange: (search: string) => void
  onStatusChange: (status: string) => void
  onViewChange: (view: 'grid' | 'list') => void
}

export function ProjectsToolbar({ search, status, view, onSearchChange, onStatusChange, onViewChange }: ProjectsToolbarProps) {
  return (
    <div className="filter-bar">
      <div className="search-field"><Search aria-hidden="true" /><Input aria-label="Buscar projetos" placeholder="Buscar um projeto…" value={search} onChange={event => onSearchChange(event.target.value)} /></div>
      <div className="filter-actions">
        <div className="filter-select"><SlidersHorizontal aria-hidden="true" /><Select aria-label="Filtrar projetos por status" value={status} onChange={event => onStatusChange(event.target.value)}>
          <option value="all">Todos os status</option>
          {Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select></div>
        <div className="segmented-control" aria-label="Visualização dos projetos">
          <button type="button" aria-label="Visualizar em cards" aria-pressed={view === 'grid'} data-active={view === 'grid'} onClick={() => onViewChange('grid')}><Grid2X2 aria-hidden="true" /></button>
          <button type="button" aria-label="Visualizar em lista" aria-pressed={view === 'list'} data-active={view === 'list'} onClick={() => onViewChange('list')}><List aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  )
}
