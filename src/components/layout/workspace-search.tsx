import { Search, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
export function WorkspaceSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Encontre sua próxima ideia"
      description="Busque projetos pelo nome ou acesse a equipe."
    >
      <form
        className="form-stack workspace-search-form"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(`/projects?search=${encodeURIComponent(value)}`)
          onOpenChange(false)
        }}
      >
        <label className="search-field">
          <Search />
          <Input
            aria-label="Buscar projetos"
            placeholder="Qual projeto você procura?"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        </label>
        <Button type="submit">
          Buscar projetos <ArrowUpRight />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            navigate('/team')
            onOpenChange(false)
          }}
        >
          Ir para a equipe
        </Button>
      </form>
    </Dialog>
  )
}
