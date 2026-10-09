import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from './button'

export interface OverlayProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  trigger?: ReactNode
}
export function Overlay({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  variant,
}: OverlayProps & { variant: 'dialog' | 'sheet' }) {
  const descriptionId = useId()
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="ui-overlay" />
        <DialogPrimitive.Content
          className={variant === 'dialog' ? 'ui-dialog' : 'ui-sheet'}
          aria-describedby={description ? descriptionId : undefined}
        >
          <header className="ui-overlay-header">
            <div>
              <DialogPrimitive.Title className="ui-overlay-title">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description id={descriptionId} className="ui-overlay-description">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </header>
          <div className="ui-overlay-body">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
