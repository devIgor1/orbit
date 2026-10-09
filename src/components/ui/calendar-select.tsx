import { setMonth, setYear } from 'date-fns'
import { useDayPicker, type DropdownProps } from 'react-day-picker'
import { OptionsSelect } from '@/components/shared/options-select'

// Single-month navigation through DayPicker's public API, without synthetic events.
export function CalendarMonthSelect(props: DropdownProps) {
  const { months, goToMonth } = useDayPicker()
  return <CalendarSelect {...props} onValueChange={(value) => goToMonth(setMonth(months[0].date, value))} />
}

export function CalendarYearSelect(props: DropdownProps) {
  const { months, goToMonth } = useDayPicker()
  return <CalendarSelect {...props} onValueChange={(value) => goToMonth(setYear(months[0].date, value))} />
}

function CalendarSelect({
  options,
  value,
  disabled,
  'aria-label': label,
  onValueChange,
}: DropdownProps & { onValueChange: (value: number) => void }) {
  return (
    <OptionsSelect
      className="ui-calendar-select"
      aria-label={label}
      disabled={disabled}
      value={String(value)}
      items={(options ?? []).map((option) => ({
        value: String(option.value),
        label: option.label,
        disabled: option.disabled,
      }))}
      onValueChange={(next) => onValueChange(Number(next))}
    />
  )
}
