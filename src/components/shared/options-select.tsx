import type { ComponentProps } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type SelectOption<Value extends string = string> = { value: Value; label: string; disabled?: boolean }
type OptionsSelectProps<Value extends string> = Omit<
  ComponentProps<'button'>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'type'
> & {
  items: readonly SelectOption<Value>[]
  value: Value
  onValueChange: (value: Value) => void
  placeholder?: string
}

/** Single selection shared by filters, forms and inline task actions. */
export function OptionsSelect<Value extends string>({
  items,
  value,
  onValueChange,
  name,
  disabled,
  placeholder,
  ...props
}: OptionsSelectProps<Value>) {
  return (
    <span className="ui-select-wrap">
      <Select<Value>
        items={items}
        value={value}
        name={name}
        disabled={disabled}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next)
        }}
      >
        <SelectTrigger {...props} disabled={disabled}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} disabled={item.disabled}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}
