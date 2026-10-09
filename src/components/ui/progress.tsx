export function Progress({ value, label = 'Progresso' }: { value: number; label?: string }) {
  return <progress className="ui-progress" value={Math.max(0, Math.min(100, value))} max={100} aria-label={label} />
}
