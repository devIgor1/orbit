import { FolderPlus, ListTodo, Users } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
export function HelpDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Grandes ideias, na mesma órbita."
      description="Um espaço para organizar o trabalho e criar coisas que importam."
      trigger={trigger}
    >
      <div className="onboarding-steps">
        <div>
          <span>
            <FolderPlus />
          </span>
          <section>
            <h3>Comece com um projeto</h3>
            <p>Defina o objetivo, o nome e a data de entrega.</p>
          </section>
        </div>
        <div>
          <span>
            <ListTodo />
          </span>
          <section>
            <h3>Dê um próximo passo às ideias</h3>
            <p>Crie tarefas, organize prioridades e acompanhe cada etapa.</p>
          </section>
        </div>
        <div>
          <span>
            <Users />
          </span>
          <section>
            <h3>Crie junto</h3>
            <p>Distribua responsabilidades e mantenha as conversas no contexto.</p>
          </section>
        </div>
      </div>
      <Button asChild>
        <Link to="/projects" onClick={() => onOpenChange(false)}>
          Explorar projetos
        </Link>
      </Button>
    </Dialog>
  )
}
