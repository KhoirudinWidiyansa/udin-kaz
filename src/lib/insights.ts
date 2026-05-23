import type { Transaction } from '@/lib/db'

export type WasteStatus = 'Sangat Hemat' | 'Sesuai Target' | 'Cenderung Boros' | 'Kritis/Sangat Boros' | 'Butuh Target'
export type InsightSeverity = 'good' | 'neutral' | 'warning' | 'danger'
export type InsightRecommendationType = 'reduce' | 'eliminate'

export interface CategorySummaryItem {
  kategori: string
  total: number
  count?: number
}

export interface InsightRecommendation {
  type: InsightRecommendationType
  title: string
  detail: string
  potentialSaving: number
  severity: InsightSeverity
}

export interface MonthlyInsight {
  status: WasteStatus
  severity: InsightSeverity
  score: number
  ratio: number | null
  headline: string
  recommendations: InsightRecommendation[]
  topCategories: Array<CategorySummaryItem & { percentage: number; count: number }>
}

interface GenerateMonthlyInsightParams {
  monthlyTarget: number
  totalPengeluaran: number
  totalCount: number
  categorySummary: CategorySummaryItem[]
  transaksi: Transaction[]
}

const NON_ESSENTIAL_CATEGORIES = new Set(['Makan', 'Belanja', 'Lainnya'])
const FIXED_CATEGORIES = new Set(['Tagihan', 'Menabung'])

export function generateMonthlyInsight(params: GenerateMonthlyInsightParams): MonthlyInsight {
  const topCategories = buildTopCategories(params)
  const ratio = params.monthlyTarget > 0 ? params.totalPengeluaran / params.monthlyTarget : null
  const { status, severity, score, headline } = buildBenchmark(params.totalPengeluaran, params.monthlyTarget, ratio)
  const recommendations = buildRecommendations(params, topCategories)

  return {
    status,
    severity,
    score,
    ratio,
    headline,
    recommendations,
    topCategories,
  }
}

function buildBenchmark(totalPengeluaran: number, monthlyTarget: number, ratio: number | null) {
  if (!ratio || monthlyTarget <= 0) {
    return {
      status: 'Butuh Target' as const,
      severity: 'neutral' as const,
      score: 8,
      headline: 'Masukkan target bulanan untuk menilai tingkat keborosan.',
    }
  }

  if (ratio <= 0.65) {
    return {
      status: 'Sangat Hemat' as const,
      severity: 'good' as const,
      score: Math.max(12, Math.round(ratio * 45)),
      headline: `Pengeluaran masih jauh di bawah target. Ruang aman tersisa ${formatPlainRupiah(monthlyTarget - totalPengeluaran)}.`,
    }
  }

  if (ratio <= 1) {
    return {
      status: 'Sesuai Target' as const,
      severity: 'neutral' as const,
      score: Math.round(35 + ratio * 35),
      headline: `Pengeluaran masih sesuai target. Sisa ruang bulan ini ${formatPlainRupiah(monthlyTarget - totalPengeluaran)}.`,
    }
  }

  if (ratio <= 1.25) {
    return {
      status: 'Cenderung Boros' as const,
      severity: 'warning' as const,
      score: Math.round(72 + (ratio - 1) * 72),
      headline: `Pengeluaran sudah melewati target sebesar ${formatPlainRupiah(totalPengeluaran - monthlyTarget)}.`,
    }
  }

  return {
    status: 'Kritis/Sangat Boros' as const,
    severity: 'danger' as const,
    score: Math.min(100, Math.round(88 + (ratio - 1.25) * 20)),
    headline: `Pengeluaran jauh di atas target. Perlu pemangkasan minimal ${formatPlainRupiah(totalPengeluaran - monthlyTarget)}.`,
  }
}

function buildTopCategories(params: GenerateMonthlyInsightParams): MonthlyInsight['topCategories'] {
  return params.categorySummary.map(item => {
    const count = item.count ?? params.transaksi.filter(transaction => transaction.kategori === item.kategori).length
    const percentage = params.totalPengeluaran > 0 ? (item.total / params.totalPengeluaran) * 100 : 0

    return {
      ...item,
      count,
      percentage,
    }
  })
}

function buildRecommendations(
  params: GenerateMonthlyInsightParams,
  topCategories: MonthlyInsight['topCategories']
): InsightRecommendation[] {
  if (params.totalCount === 0) {
    return []
  }

  const recommendations: InsightRecommendation[] = []
  const dominant = topCategories[0]

  if (dominant && dominant.percentage >= 35 && !FIXED_CATEGORIES.has(dominant.kategori)) {
    const targetReduction = Math.round(dominant.total * 0.22)
    recommendations.push({
      type: 'reduce',
      title: `Kurangi kategori ${dominant.kategori}`,
      detail: `${dominant.kategori} menyerap ${Math.round(dominant.percentage)}% pengeluaran bulan ini dari ${dominant.count} transaksi. Turunkan porsi ini sekitar 20% untuk membuat dampak cepat.`,
      potentialSaving: targetReduction,
      severity: dominant.percentage >= 50 ? 'danger' : 'warning',
    })
  }

  const frequentCategory = topCategories.find(item =>
    NON_ESSENTIAL_CATEGORIES.has(item.kategori) && item.count >= 6
  )

  if (frequentCategory) {
    const trimmedFrequency = Math.ceil(frequentCategory.count / 2)
    const average = frequentCategory.total / frequentCategory.count
    recommendations.push({
      type: 'reduce',
      title: `Batasi frekuensi ${frequentCategory.kategori}`,
      detail: `Ada ${frequentCategory.count} transaksi ${frequentCategory.kategori}. Coba turunkan menjadi ${trimmedFrequency} kali bulan depan.`,
      potentialSaving: Math.round(average * (frequentCategory.count - trimmedFrequency)),
      severity: 'warning',
    })
  }

  const eliminationCandidate = topCategories.find(item =>
    item.kategori === 'Lainnya' || (item.kategori === 'Belanja' && item.percentage >= 25)
  )

  if (eliminationCandidate) {
    recommendations.push({
      type: 'eliminate',
      title: `Audit pengeluaran ${eliminationCandidate.kategori}`,
      detail: `${eliminationCandidate.kategori} berpotensi berisi pembelian impulsif atau item yang tidak wajib. Tandai 1-2 transaksi terbesar untuk tidak diulang bulan depan.`,
      potentialSaving: Math.round(eliminationCandidate.total * 0.15),
      severity: eliminationCandidate.percentage >= 35 ? 'danger' : 'warning',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'reduce',
      title: 'Pertahankan pola saat ini',
      detail: 'Belum ada kategori non-esensial yang dominan. Fokus pada pencatatan yang konsisten agar analisis bulan depan lebih tajam.',
      potentialSaving: 0,
      severity: 'good',
    })
  }

  return dedupeRecommendations(recommendations).slice(0, 3)
}

function dedupeRecommendations(recommendations: InsightRecommendation[]): InsightRecommendation[] {
  const seen = new Set<string>()

  return recommendations.filter(item => {
    const key = `${item.type}-${item.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function formatPlainRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}
