import { useId, useRef, useState, type ComponentProps } from 'react'
import { CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { parseDateOnly, serializeDateOnly } from '@/lib/date-only'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type DatePickerProps = Omit<ComponentProps<'button'>, 'value' | 'onChange' | 'type' | 'children' | 'defaultValue'> & {
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
}

/** Shared shadcn Calendar + Popover composition; form values stay YYYY-MM-DD. */
export function DatePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Selecione uma data',
  'aria-describedby': describedBy,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const valueId = useId()
  const date = parseDateOnly(value)
  const today = new Date()

  function selectDate(selected: Date | undefined) {
    onChange(serializeDateOnly(selected))
    setOpen(false)
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...props}
          variant="outline"
          disabled={disabled}
          aria-describedby={[valueId, describedBy].filter(Boolean).join(' ')}
          data-empty={!date}
          className={cn('ui-date-picker', className)}
        >
          <span id={valueId}>{date ? format(date, 'dd/MM/yyyy') : placeholder}</span>
          <CalendarDays aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        className="ui-date-picker-popover"
        align="start"
        aria-label="Selecionar data"
        onOpenAutoFocus={(event) => {
          // Focus after Radix suspends the parent Dialog/Sheet focus trap.
          event.preventDefault()
          contentRef.current?.querySelector<HTMLButtonElement>('[data-day][tabindex="0"]')?.focus()
        }}
      >
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={date}
          defaultMonth={date}
          startMonth={new Date(Math.min(1900, date?.getFullYear() ?? 1900), 0)}
          endMonth={new Date(Math.max(today.getFullYear() + 20, date?.getFullYear() ?? 0), 11)}
          onSelect={selectDate}
          autoFocus
        />
        <div className="ui-date-picker-actions">
          <Button variant="ghost" size="sm" onClick={() => selectDate(today)}>
            Hoje
          </Button>
          <Button variant="ghost" size="sm" onClick={() => selectDate(undefined)} disabled={!date}>
            Limpar data
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
