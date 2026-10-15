import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/shared/query-state'
import { useGithubRepositoryChoice } from '../hooks/use-github-repository-choice'
import type { GithubRepositoryChoice as Choice } from '../services/github-repository-selection'

export function GithubRepositoryChoice({ choice }: { choice: Choice }) {
  const selection = useGithubRepositoryChoice(choice)
  return (
    <div className="github-content">
      <div className="github-content">
        <h2 className="github-choice-title">Escolha os repositórios de {choice.accountLogin}</h2>
        <p className="github-note">
          Somente os repositórios selecionados ficarão conectados a esta empresa. Desmarque os já conectados para
          removê-los da seleção.
        </p>
      </div>
      <Input
        aria-label="Buscar repositórios"
        placeholder="Buscar pelo nome do repositório"
        value={selection.search}
        onChange={(event) => selection.setSearch(event.target.value)}
      />
      <div className="github-reference-toolbar">
        <p className="github-note" aria-live="polite">
          {selection.selected.size} {selection.selected.size === 1 ? 'selecionado' : 'selecionados'}
          {selection.removed > 0
            ? ` · ${selection.removed} ${selection.removed === 1 ? 'será desconectado' : 'serão desconectados'}`
            : ''}
        </p>
        <div className="github-task-actions">
          <Button
            size="sm"
            variant="ghost"
            disabled={selection.disabled || !selection.visible.length}
            onClick={selection.selectVisible}
          >
            Selecionar resultados
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={selection.disabled || !selection.selected.size}
            onClick={selection.clear}
          >
            Limpar seleção
          </Button>
        </div>
      </div>
      <fieldset className="github-repository-options" disabled={selection.disabled}>
        <legend className="sr-only">Repositórios disponíveis</legend>
        {selection.visible.map((repo) => (
          <label className="github-repository-option" key={repo.id}>
            <Checkbox
              aria-labelledby={`github-repository-name-${repo.id}`}
              checked={selection.selected.has(repo.id)}
              disabled={selection.disabled || repo.inUse}
              onCheckedChange={(checked) => selection.toggle(repo.id, checked)}
            />
            <span className="company-list-details">
              <strong id={`github-repository-name-${repo.id}`}>{repo.fullName}</strong>
              <span>
                {repo.isPrivate ? 'Privado' : 'Público'}
                {repo.connected ? ' · Conectado' : ''}
                {repo.inUse ? ' · Em uso em tarefa' : ''}
              </span>
            </span>
          </label>
        ))}
        {!selection.visible.length && <p className="github-note">Nenhum repositório corresponde à busca.</p>}
      </fieldset>
      {choice.repositories.some((repo) => repo.inUse) && (
        <p className="github-note">
          Repositórios em uso por projetos ou tarefas são mantidos na seleção. Para removê-los, troque o repositório
          desses projetos e remova os vínculos dessas tarefas.
        </p>
      )}
      {choice.skippedCount > 0 && (
        <p className="github-note">
          {choice.skippedCount} repositório(s) sem permissão de escrita não estão disponíveis para conexão.
        </p>
      )}
      {selection.save.isError && <ErrorState error={selection.save.error} />}
      <Button
        className="github-connect-button"
        disabled={selection.disabled || !selection.selected.size}
        onClick={() => selection.save.mutate()}
      >
        {selection.save.isPending || selection.save.isSuccess ? 'Salvando seleção…' : 'Salvar seleção'}
      </Button>
    </div>
  )
}
