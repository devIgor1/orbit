import * as PopoverPrimitive from '@radix-ui/react-popover'
import type { ComponentProps } from 'react'
import { usePopoverGeometry } from '@/lib/dom/popover-geometry'
import { cn } from '@/lib/utils'

// Adapted from shadcn/ui's Radix Popover; visual rules live in globals.css.
export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />
}

export function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

export function PopoverContent({
  className,
  align = 'center',
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  const geometry = usePopoverGeometry()
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        {...geometry}
        className={cn('ui-popover', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
