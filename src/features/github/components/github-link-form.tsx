import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { OptionsSelect } from '@/components/shared/options-select'
import { ErrorState } from '@/components/shared/query-state'
import { githubLinkSchema, type GithubLinkValues } from '../schemas/github-link-schema'
import type { GithubPullFilter } from '../schemas/github-reference-schema'
import { useGithubReferences } from '../hooks/use-github-references'
import { referenceOptions } from '../reference-options'
import { GithubReferencePicker } from './github-reference-picker'

type Props = {
  taskId: string
  repository: { id: string; full_name: string }
  isPending: boolean
  error: unknown
  onSubmit: (values: GithubLinkValues) => Promise<void>
}
export function GithubLinkForm({ taskId, repository, isPending, error, onSubmit }: Props) {
  const id = useId()
  const form = useForm<GithubLinkValues>({
    resolver: zodResolver(githubLinkSchema),
    defaultValues: { repositoryId: repository.id, reference: '' },
  })
  const repositoryId = repository.id
  const reference = useWatch({ control: form.control, name: 'reference' })
  const [pullState, setPullState] = useState<GithubPullFilter>('open')
  const query = useGithubReferences(taskId, repositoryId, 'pr', pullState)
  const selected = query.isSuccess
    ? referenceOptions(query.data.pages).find((option) => option.value === reference)
    : undefined
  const canSubmit = Boolean(selected && !selected.disabled && !query.isFetching && !isPending)
  return (
    <form
      className="github-link-form"
      onSubmit={form.handleSubmit(async (values) => {
        if (canSubmit) await onSubmit(values)
      })}
    >
      <p className="github-note">
        Vincule o PR que entrega esta tarefa. Repositório do projeto: <strong>{repository.full_name}</strong>
      </p>
      <div className="form-field">
        <label htmlFor={`${id}-pull-state`}>Status dos PRs</label>
        <OptionsSelect
          id={`${id}-pull-state`}
          value={pullState}
          onValueChange={(value) => {
            form.resetField('reference')
            setPullState(value)
          }}
          disabled={isPending}
          items={[
            { value: 'open', label: 'Abertos e rascunhos' },
            { value: 'closed', label: 'Fechados e integrados' },
            { value: 'all', label: 'Todos os PRs' },
          ]}
        />
      </div>
      <Controller
        control={form.control}
        name="reference"
        render={({ field }) => (
          <GithubReferencePicker
            key={`${repositoryId}:${pullState}`}
            query={query}
            kind="pr"
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            inputRef={field.ref}
            disabled={isPending}
            error={form.formState.errors.reference?.message}
          />
        )}
      />
      <p className="github-note">
        PR pronto move a tarefa para revisão. O merge conclui a tarefa e publica um comentário com o título e o link
        para o Orbit.
      </p>
      {Boolean(error) && <ErrorState error={error} />}
      <Button type="submit" disabled={!canSubmit}>
        {isPending ? 'Validando no GitHub…' : 'Vincular PR à tarefa'}
      </Button>
    </form>
  )
}
