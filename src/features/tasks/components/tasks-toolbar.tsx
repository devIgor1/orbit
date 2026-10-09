import { Columns3, List, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { OptionsSelect } from '@/components/shared/options-select'
import type { Task } from '@/lib/supabase/database.types'
import { taskPriorityLabels } from '../schemas/task-schema'

type TasksToolbarProps = {
  search: string
  priority: Task['priority'] | 'all'
  view: 'board' | 'list'
  onSearchChange: (value: string) => void
  onPriorityChange: (value: Task['priority'] | 'all') => void
  onViewChange: (value: 'board' | 'list') => void
}

export function TasksToolbar({
  search,
  priority,
  view,
  onSearchChange,
  onPriorityChange,
  onViewChange,
}: TasksToolbarProps) {
  return (
    <div className="filter-bar">
      <div className="search-field">
        <Search aria-hidden="true" />
        <Input
          placeholder="Buscar uma tarefa…"
          aria-label="Buscar tarefas"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="filter-actions">
        <OptionsSelect
          value={priority}
          aria-label="Filtrar por prioridade"
          onValueChange={(value) => {
            if (value === 'low' || value === 'medium' || value === 'high' || value === 'all') onPriorityChange(value)
          }}
          items={[
            { value: 'all', label: 'Todas as prioridades' },
            ...Object.entries(taskPriorityLabels).map(([value, label]) => ({
              value,
              label: `Prioridade ${label.toLowerCase()}`,
            })),
          ]}
        />
        <div className="segmented-control" aria-label="Visualização das tarefas">
          <button
            type="button"
            aria-pressed={view === 'board'}
            data-active={view === 'board'}
            onClick={() => onViewChange('board')}
          >
            <Columns3 aria-hidden="true" />
            <span>Quadro</span>
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            data-active={view === 'list'}
            onClick={() => onViewChange('list')}
          >
            <List aria-hidden="true" />
            <span>Lista</span>
          </button>
        </div>
      </div>
    </div>
  )
}
