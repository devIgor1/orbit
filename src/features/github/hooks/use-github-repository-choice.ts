import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { selectGithubRepositories, type GithubRepositoryChoice } from '../services/github-repository-selection'

export function useGithubRepositoryChoice(choice: GithubRepositoryChoice) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(
    () => new Set(choice.repositories.filter((repo) => repo.connected || repo.inUse).map((repo) => repo.id)),
  )
  const save = useMutation({
    mutationFn: () => selectGithubRepositories(choice.state, [...selected]),
    retry: false,
    onSuccess: ({ url }) => window.location.assign(url),
  })
  const visible = choice.repositories.filter((repo) =>
    repo.fullName.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )
  const removed = choice.repositories.filter((repo) => repo.connected && !selected.has(repo.id)).length
  const toggle = (id: number, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  return {
    search,
    setSearch,
    selected,
    visible,
    removed,
    toggle,
    save,
    disabled: save.isPending || save.isSuccess || save.isError,
    selectVisible: () => setSelected((current) => new Set([...current, ...visible.map((repo) => repo.id)])),
    clear: () => setSelected(new Set(choice.repositories.filter((repo) => repo.inUse).map((repo) => repo.id))),
  }
}
