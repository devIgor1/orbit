import { ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import { useCompanies } from '../hooks/use-companies'

export function CompanyAccessList({ busy, onSelect }: { busy: boolean; onSelect: (id: string) => void }) {
  const companies = useCompanies()
  if (companies.isPending) return <LoadingState label="Buscando suas empresas…" />
  if (companies.isError) return <ErrorState error={companies.error} onRetry={() => void companies.refetch()} />
  if (companies.data.length === 0)
    return (
      <EmptyState
        title="Seu espaço começa aqui"
        description="Cadastre sua empresa ou aceite um convite para começar a trabalhar com sua equipe."
      />
    )
  return (
    <ul className="company-list">
      {companies.data.map((company) => (
        <li className="company-list-row" key={company.id}>
          <Building2 aria-hidden="true" />
          <strong>{company.name}</strong>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => onSelect(company.id)}
            aria-label={`Abrir ${company.name}`}
          >
            Abrir <ArrowRight />
          </Button>
        </li>
      ))}
    </ul>
  )
}
