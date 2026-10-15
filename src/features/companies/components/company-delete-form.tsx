import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorState } from '@/components/shared/query-state'

type Props = {
  name: string
  isPending: boolean
  error: unknown
  onConfirm: (confirmation: string) => void
  onCancel: () => void
}

/** Deleting a company requires typing its exact name. */
export function CompanyDeleteForm({ name, isPending, error, onConfirm, onCancel }: Props) {
  const [confirmation, setConfirmation] = useState('')
  const matches = confirmation.trim() === name
  return (
    <form
      className="form-stack"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (matches) onConfirm(confirmation.trim())
      }}
    >
      <ul className="danger-list">
        <li>Todos os membros perdem o acesso imediatamente.</li>
        <li>Projetos, tarefas, comentários e repositórios conectados ficam inacessíveis.</li>
        <li>Convites pendentes são cancelados.</li>
        <li>Administradores podem restaurar a empresa em até 15 dias; depois, tudo é apagado definitivamente.</li>
      </ul>
      <div className="form-field">
        <label htmlFor="company-delete-confirmation">
          Digite <strong>{name}</strong> para confirmar
        </label>
        <Input
          id="company-delete-confirmation"
          autoComplete="off"
          autoFocus
          disabled={isPending}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </div>
      {Boolean(error) && <ErrorState error={error} />}
      <div className="form-actions">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" disabled={!matches || isPending}>
          {isPending ? 'Excluindo…' : 'Excluir empresa'}
        </Button>
      </div>
    </form>
  )
}
