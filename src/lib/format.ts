export const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)
export function formatDate(value: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Sem prazo'
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return new Intl.DateTimeFormat('pt-BR', options ?? { day: '2-digit', month: 'short' }).format(date)
}
export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() }
