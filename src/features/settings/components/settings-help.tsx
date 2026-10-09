import { useState } from 'react'
import { ArrowUpRight, CircleHelp } from 'lucide-react'
import { HelpDialog } from '@/components/layout/help-dialog'
import { Button } from '@/components/ui/button'

export function SettingsHelp() {
  const [open, setOpen] = useState(false)
  return (
    <aside className="settings-help" aria-labelledby="settings-help-title">
      <CircleHelp aria-hidden="true" />
      <div>
        <h2 id="settings-help-title">Um próximo passo mais fácil.</h2>
        <p>Relembre como organizar projetos, tarefas e sua equipe.</p>
      </div>
      <HelpDialog
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button variant="ghost">
            Abrir guia do Orbit <ArrowUpRight />
          </Button>
        }
      />
    </aside>
  )
}
