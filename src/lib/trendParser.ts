import type { Transaction } from '@/lib/db'

export interface TrendDataPoint {
  time_period: string
  total_spending: number
  transaction_count: number
}

export type ViewMode = 'daily' | 'weekly' | 'monthly'

/**
 * Parse transactions into time-series data for trend chart
 */
export function parseTrendData(
  transactions: Transaction[],
  viewMode: ViewMode,
  filterKategori?: string,
  filterNama?: string
): TrendDataPoint[] {
  // Apply filters
  let filtered = transactions
  
  if (filterKategori) {
    filtered = filtered.filter(t => t.kategori === filterKategori)
  }
  
  if (filterNama) {
    filtered = filtered.filter(t => t.nama === filterNama)
  }
  
  if (filtered.length === 0) return []
  
  // Group by time period
  const grouped: Record<string, { total: number; count: number }> = {}
  
  filtered.forEach(transaction => {
    const period = getTimePeriod(transaction.tanggal, viewMode)
    
    if (!grouped[period]) {
      grouped[period] = { total: 0, count: 0 }
    }
    
    grouped[period].total += transaction.nominal
    grouped[period].count += 1
  })
  
  // Convert to array and sort chronologically
  const dataPoints: TrendDataPoint[] = Object.entries(grouped)
    .map(([time_period, data]) => ({
      time_period,
      total_spending: data.total,
      transaction_count: data.count,
    }))
    .sort((a, b) => a.time_period.localeCompare(b.time_period))
  
  return dataPoints
}

/**
 * Get time period string based on view mode
 */
function getTimePeriod(dateString: string, viewMode: ViewMode): string {
  const date = new Date(dateString)
  
  switch (viewMode) {
    case 'daily':
      return dateString // YYYY-MM-DD
    
    case 'weekly': {
      // Get ISO week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`
    }
    
    case 'monthly':
      return dateString.substring(0, 7) // YYYY-MM
    
    default:
      return dateString
  }
}

/**
 * Format time period for display
 */
export function formatTimePeriod(period: string, viewMode: ViewMode): string {
  switch (viewMode) {
    case 'daily': {
      const date = new Date(period)
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }
    
    case 'weekly':
      return period.replace('-W', ' Minggu ')
    
    case 'monthly': {
      const [year, month] = period.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
    }
    
    default:
      return period
  }
}

/**
 * Get chart data for last N days/weeks/months
 */
export function getRecentTrendData(
  transactions: Transaction[],
  viewMode: ViewMode,
  periods: number = 30,
  filterKategori?: string,
  filterNama?: string
): TrendDataPoint[] {
  const allData = parseTrendData(transactions, viewMode, filterKategori, filterNama)
  
  // Return last N periods
  return allData.slice(-periods)
}
