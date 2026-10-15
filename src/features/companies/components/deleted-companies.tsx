import { RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/query-state'
import { formatDate } from '@/lib/format'
import { useDeletedCompanies } from '../hooks/use-companies'

/** Companies in the trash; rendered only when the user can restore one. */
export function DeletedCompanies({ busy, onRestore }: { busy: boolean; onRestore: (id: string) => void }) {
  const companies = useDeletedCompanies()
  if (companies.isError) return <ErrorState error={companies.error} onRetry={() => void companies.refetch()} />
  if (!companies.isSuccess || companies.data.length === 0) return null
  return (
    <section className="panel company-panel">
      <h2>Empresas excluídas</h2>
      <ul className="company-list">
        {companies.data.map((company) => (
          <li className="company-list-row" key={company.id}>
            <Trash2 aria-hidden="true" />
            <div className="company-list-details">
              <strong>{company.name}</strong>
              <small>
                Apagada definitivamente em {formatDate(company.purge_at, { day: '2-digit', month: 'long' })}
              </small>
            </div>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => onRestore(company.id)}
              aria-label={`Restaurar ${company.name}`}
            >
              <RotateCcw /> Restaurar
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
