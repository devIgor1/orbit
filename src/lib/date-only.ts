import { format, isValid, parseISO } from 'date-fns'

// PostgreSQL DATE has no time zone. Parse and serialize local calendar dates;
// never use toISOString(), which can shift the chosen day across time zones.
export function parseDateOnly(value: string | null | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = parseISO(value)
  return isValid(date) && format(date, 'yyyy-MM-dd') === value ? date : undefined
}

export function serializeDateOnly(date: Date | undefined): string {
  return date && isValid(date) ? format(date, 'yyyy-MM-dd') : ''
}
