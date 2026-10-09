import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { usePopoverGeometry } from '@/lib/dom/popover-geometry'
import { SelectLayer } from './select-layer'

// shadcn/ui Base Select, adapted from base-nova to Orbit's semantic CSS.
export const Select = SelectPrimitive.Root
type Styled<Props> = Omit<Props, 'className'> & { className?: string }

export function SelectTrigger({
  className,
  children,
  ...props
}: Styled<ComponentProps<typeof SelectPrimitive.Trigger>>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn('ui-select', className)} {...props}>
      {children}
      <SelectPrimitive.Icon className="ui-select-icon">
        <ChevronDown aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectValue({ className, ...props }: Styled<SelectPrimitive.Value.Props>) {
  return <SelectPrimitive.Value data-slot="select-value" className={cn('ui-select-value', className)} {...props} />
}

export function SelectContent({ className, children, ...props }: Styled<SelectPrimitive.Popup.Props>) {
  const geometry = usePopoverGeometry()
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        className="ui-select-positioner"
        side="bottom"
        align="start"
        alignItemWithTrigger={false}
        {...geometry}
      >
        <SelectLayer>
          <SelectPrimitive.Popup data-slot="select-content" className={cn('ui-select-content', className)} {...props}>
            <SelectPrimitive.ScrollUpArrow className="ui-select-scroll">
              <ChevronUp aria-hidden="true" />
            </SelectPrimitive.ScrollUpArrow>
            <SelectPrimitive.List className="ui-select-list">{children}</SelectPrimitive.List>
            <SelectPrimitive.ScrollDownArrow className="ui-select-scroll">
              <ChevronDown aria-hidden="true" />
            </SelectPrimitive.ScrollDownArrow>
          </SelectPrimitive.Popup>
        </SelectLayer>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }: Styled<SelectPrimitive.Item.Props>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn('ui-select-item', className)} {...props}>
      <SelectPrimitive.ItemText className="ui-select-item-text">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="ui-select-indicator">
        <Check aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function SelectGroup({ className, ...props }: Styled<SelectPrimitive.Group.Props>) {
  return <SelectPrimitive.Group className={cn('ui-select-group', className)} {...props} />
}

export function SelectLabel({ className, ...props }: Styled<SelectPrimitive.GroupLabel.Props>) {
  return <SelectPrimitive.GroupLabel className={cn('ui-select-label', className)} {...props} />
}

export function SelectSeparator({ className, ...props }: Styled<SelectPrimitive.Separator.Props>) {
  return <SelectPrimitive.Separator className={cn('ui-select-separator', className)} {...props} />
}
