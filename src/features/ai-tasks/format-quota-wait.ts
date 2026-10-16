export function formatQuotaWait(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return [hours > 0 ? `${hours} h` : '', minutes > 0 ? `${minutes} min` : '',
    remainder > 0 || seconds === 0 ? `${remainder} s` : ''].filter(Boolean).join(' ')
}
