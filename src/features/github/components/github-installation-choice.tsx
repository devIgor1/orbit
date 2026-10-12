import { Building2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/query-state'
import { useGithubInstallationChoice } from '../hooks/use-github-installation-choice'
import type { GithubInstallation } from '../services/github-discovery'

export function GithubInstallationChoice({
  state,
  installations,
}: {
  state: string
  installations: GithubInstallation[]
}) {
  const choice = useGithubInstallationChoice(state)
  const disabled = choice.isPending || choice.isSuccess || choice.isError
  return (
    <div className="github-content">
      <div className="github-content">
        <h2 className="github-choice-title">Escolha a conta para conectar</h2>
        <p className="github-note">
          O App já está instalado nestas contas. Escolha de onde importar os repositórios para esta empresa.
        </p>
      </div>
      <ul className="company-list" aria-label="Contas do GitHub disponíveis">
        {installations.map((installation) => (
          <li className="company-list-row github-installation-row" key={installation.id}>
            {installation.accountType === 'Organization' ? (
              <Building2 aria-hidden="true" />
            ) : (
              <UserRound aria-hidden="true" />
            )}
            <div className="company-list-details">
              <strong>{installation.accountLogin}</strong>
              <span>{installation.accountType === 'Organization' ? 'Organização' : 'Conta pessoal'}</span>
            </div>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => choice.mutate(installation.id)}
              aria-label={`Conectar ${installation.accountLogin}`}
            >
              {choice.isPending && choice.variables === installation.id ? 'Conectando…' : 'Conectar'}
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="github-connect-button" disabled={disabled} onClick={() => choice.mutate(null)}>
        Conectar outra conta ou organização
      </Button>
      {choice.isError && <ErrorState error={choice.error} />}
      {(choice.isPending || choice.isSuccess) && (
        <p className="github-note" role="status">
          Continuando a conexão pelo GitHub…
        </p>
      )}
    </div>
  )
}
