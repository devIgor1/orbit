import { useEffect, useRef, type ComponentProps } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DayPicker, type DayButton } from 'react-day-picker'
import { cn } from '@/lib/utils'
import { serializeDateOnly } from '@/lib/date-only'
import { Button } from './button'
import { CalendarMonthSelect, CalendarYearSelect } from './calendar-select'

// shadcn/ui Calendar (new-york-v4), adapted to Orbit's semantic CSS and pt-BR.
export function Calendar({ className, classNames, components, labels, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays
      fixedWeeks
      className={cn('ui-calendar', className)}
      classNames={{
        months: 'ui-calendar-months',
        month: 'ui-calendar-month',
        nav: 'ui-calendar-nav',
        button_previous: 'ui-calendar-nav-button',
        button_next: 'ui-calendar-nav-button',
        month_caption: 'ui-calendar-caption',
        caption_label: 'ui-calendar-caption-label',
        dropdowns: 'ui-calendar-dropdowns',
        month_grid: 'ui-calendar-grid',
        weekday: 'ui-calendar-weekday',
        day: 'ui-calendar-day',
        today: 'ui-calendar-today',
        outside: 'ui-calendar-outside',
        disabled: 'ui-calendar-disabled',
        hidden: 'ui-calendar-hidden',
        selected: 'ui-calendar-selected',
        range_start: 'ui-calendar-range-start',
        range_middle: 'ui-calendar-range-middle',
        range_end: 'ui-calendar-range-end',
        footer: 'ui-calendar-announcement',
        ...classNames,
      }}
      labels={{
        labelNav: () => 'Navegação do calendário',
        labelPrevious: () => 'Mês anterior',
        labelNext: () => 'Próximo mês',
        labelMonthDropdown: () => 'Mês',
        labelYearDropdown: () => 'Ano',
        labelGrid: (date) => format(date, 'MMMM yyyy', { locale: ptBR }),
        labelDayButton: (date, modifiers) =>
          [
            format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }),
            modifiers.today ? 'hoje' : '',
            modifiers.selected ? 'selecionado' : '',
          ]
            .filter(Boolean)
            .join(', '),
        ...labels,
      }}
      components={{
        Chevron: ({ orientation, className }) => {
          const Icon = orientation === 'left' ? ChevronLeft : orientation === 'right' ? ChevronRight : ChevronDown
          return <Icon className={cn('ui-calendar-chevron', className)} aria-hidden="true" />
        },
        DayButton: CalendarDayButton,
        MonthsDropdown: CalendarMonthSelect,
        YearsDropdown: CalendarYearSelect,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: ComponentProps<typeof DayButton>) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={serializeDateOnly(day.date)}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn('ui-calendar-day-button', className)}
      {...props}
    />
  )
}
