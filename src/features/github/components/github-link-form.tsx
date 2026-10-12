import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OptionsSelect } from '@/components/shared/options-select'
import { ErrorState } from '@/components/shared/query-state'
import { githubLinkSchema, type GithubLinkValues } from '../schemas/github-link-schema'

type Props = { isPending: boolean; error: unknown; onSubmit: (values: GithubLinkValues) => Promise<void> }
export function GithubLinkForm({ isPending, error, onSubmit }: Props) {
  const form = useForm<GithubLinkValues>({
    resolver: zodResolver(githubLinkSchema),
    defaultValues: { kind: 'branch', reference: '' },
  })
  const kind = useWatch({ control: form.control, name: 'kind' })
  return (
    <form className="github-link-form" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="form-field">
        <label htmlFor="github-link-kind">Vincular por</label>
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <OptionsSelect
              id="github-link-kind"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              ref={field.ref}
              disabled={isPending}
              items={[
                { value: 'branch', label: 'Nome da branch' },
                { value: 'pr', label: 'Número do pull request' },
              ]}
            />
          )}
        />
      </div>
      <div className="form-field">
        <label htmlFor="github-link-reference">{kind === 'branch' ? 'Branch de trabalho' : 'Número do PR'}</label>
        <Input
          id="github-link-reference"
          {...form.register('reference')}
          placeholder={kind === 'branch' ? 'feat/minha-tarefa' : '42'}
          disabled={isPending}
          aria-invalid={Boolean(form.formState.errors.reference)}
          aria-describedby="github-reference-help"
        />
        <p id="github-reference-help" className={form.formState.errors.reference ? 'form-error' : 'github-note'}>
          {form.formState.errors.reference?.message ??
            (kind === 'branch'
              ? 'O Orbit encontra o PR desta branch automaticamente. Para branches reutilizadas ou forks, informe o PR.'
              : 'Use o número do PR no repositório deste projeto.')}
        </p>
      </div>
      <p className="github-note">
        PR pronto move a tarefa para revisão. O merge conclui a tarefa e publica um comentário com o título e o link
        para o Orbit.
      </p>
      {Boolean(error) && <ErrorState error={error} />}
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Validando no GitHub…' : 'Vincular à tarefa'}
      </Button>
    </form>
  )
}
