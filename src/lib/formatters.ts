export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export function formatTanggal(tanggal: string): string {
  if (!tanggal) return '-'
  const dateStr = tanggal.includes('T') ? tanggal : tanggal + 'T00:00:00'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

export function getTodayInputDate(): string {
  return new Date().toISOString().split('T')[0]
}
