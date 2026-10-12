import { useId, useState, type Ref } from 'react'
import { RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { OptionsSelect } from '@/components/shared/options-select'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/query-state'
import type { useGithubReferences } from '../hooks/use-github-references'
import { referenceOptions } from '../reference-options'
import type { GithubReferenceKind } from '../schemas/github-reference-schema'

type Props = {
  query: ReturnType<typeof useGithubReferences>
  kind: GithubReferenceKind
  value: string
  onValueChange: (value: string) => void
  onBlur: () => void
  inputRef: Ref<HTMLButtonElement>
  disabled: boolean
  error?: string
}
export function GithubReferencePicker({ query, kind, value, onValueChange, onBlur, inputRef, disabled, error }: Props) {
  const id = useId()
  const [search, setSearch] = useState('')
  if (query.isError)
    return (
      <div className="github-reference-picker">
        <ErrorState
          error={query.error}
          onRetry={
            disabled ? undefined : () => void (query.isFetchNextPageError ? query.fetchNextPage() : query.refetch())
          }
        />
      </div>
    )
  if (query.isPending)
    return (
      <div className="github-reference-picker">
        <LoadingState label={kind === 'branch' ? 'Buscando branches…' : 'Buscando PRs…'} />
      </div>
    )
  const options = referenceOptions(query.data.pages)
  const selected = options.find((option) => option.value === value)
  const term = search.trim().toLocaleLowerCase('pt-BR')
  const matches = options.filter((option) =>
    `${option.label} ${option.description}`.toLocaleLowerCase('pt-BR').includes(term),
  )
  const visible = selected && !matches.includes(selected) ? [selected, ...matches] : matches
  return (
    <div className="github-reference-picker" aria-busy={query.isFetching}>
      <div className="github-reference-toolbar">
        <p className="github-note" role="status">
          {options.length}{' '}
          {kind === 'branch'
            ? options.length === 1
              ? 'branch carregada'
              : 'branches carregadas'
            : options.length === 1
              ? 'PR carregado'
              : 'PRs carregados'}
        </p>
        <Button size="sm" variant="ghost" disabled={disabled || query.isFetching} onClick={() => void query.refetch()}>
          <RefreshCw aria-hidden="true" />
          {query.isRefetching ? 'Atualizando…' : 'Atualizar opções'}
        </Button>
      </div>
      {options.length > 0 ? (
        <>
          <div className="form-field">
            <label htmlFor={`${id}-search`}>
              {kind === 'branch' ? 'Filtrar branches carregadas' : 'Filtrar PRs carregados'}
            </label>
            <Input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault()
              }}
              disabled={disabled}
              placeholder={kind === 'branch' ? 'Buscar pelo nome…' : 'Buscar por título, número ou branch…'}
            />
          </div>
          <div className="form-field">
            <label htmlFor={`${id}-select`}>{kind === 'branch' ? 'Branch de trabalho' : 'Pull request'}</label>
            <OptionsSelect
              id={`${id}-select`}
              ref={inputRef}
              value={value}
              onValueChange={onValueChange}
              onBlur={onBlur}
              disabled={disabled || query.isFetching || visible.length === 0}
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-help`}
              items={[{ value: '', label: 'Selecione uma opção', disabled: true }, ...visible]}
            />
            <p id={`${id}-help`} className={error ? 'form-error' : 'github-note'}>
              {error ??
                (kind === 'branch'
                  ? 'O PR desta branch será encontrado automaticamente. Para forks, selecione o PR.'
                  : 'Escolha um PR deste repositório, inclusive os enviados por forks.')}
            </p>
          </div>
          {matches.length === 0 && (
            <p className="github-note" role="status">
              Nenhum resultado entre as opções carregadas. Altere o filtro
              {query.hasNextPage ? ' ou carregue mais opções' : ''}.
            </p>
          )}
          {selected?.description && (
            <p className="github-reference-detail">
              {selected.label}
              <br />
              {selected.description}
            </p>
          )}
          {selected?.merged && (
            <p className="github-note" role="status">
              Este PR já foi integrado. A sincronização concluirá a tarefa e publicará o comentário após o vínculo.
            </p>
          )}
        </>
      ) : (
        <EmptyState
          title={kind === 'branch' ? 'Nenhuma branch de trabalho' : 'Nenhum PR encontrado'}
          description={
            kind === 'branch'
              ? 'A branch padrão não pode ser vinculada a uma tarefa.'
              : 'Não há PRs neste filtro. Experimente outro status ou atualize a lista.'
          }
        />
      )}
      {query.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || query.isFetching}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Carregando…' : 'Carregar mais opções'}
        </Button>
      )}
    </div>
  )
}
