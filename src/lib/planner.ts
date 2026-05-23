export type PlannerMode = 'hemat' | 'sedang' | 'boros'

export interface PlannerRequest {
  context: string
  budget: number
  items: string[]
}

export interface PlannerScenarioItem {
  name: string
  amount: number
  note: string
}

export interface PlannerScenario {
  mode: PlannerMode
  title: string
  description: string
  total: number
  remaining: number
  status: 'safe' | 'tight' | 'over'
  items: PlannerScenarioItem[]
  recommendation: string
}

interface PriceProfile {
  keywords: string[]
  low: number
  medium: number
  high: number
  lowNote: string
  mediumNote: string
  highNote: string
}

const PRICE_PROFILES: PriceProfile[] = [] // DIHAPUS: Dummy data sudah dihapus, logic harga selanjutnya dikendalikan oleh AI.

const MODE_COPY: Record<PlannerMode, Pick<PlannerScenario, 'title' | 'description'>> = {
  hemat: {
    title: 'Skenario Hemat',
    description: 'Menekan biaya dan menjaga cadangan.',
  },
  sedang: {
    title: 'Skenario Sedang',
    description: 'Menyeimbangkan kenyamanan dan batas budget.',
  },
  boros: {
    title: 'Skenario Boros',
    description: 'Mensimulasikan pilihan premium dan risiko over-budget.',
  },
}

export function parsePlannerItems(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean)
}

export function generatePlannerScenarios(request: PlannerRequest): PlannerScenario[] {
  const normalizedRequest = {
    ...request,
    items: request.items.map(item => item.trim()).filter(Boolean),
  }

  if (normalizedRequest.budget <= 0 || normalizedRequest.items.length === 0) {
    return []
  }

  return [
    buildScenario('hemat', normalizedRequest),
    buildScenario('sedang', normalizedRequest),
    buildScenario('boros', normalizedRequest),
  ]
}

function buildScenario(mode: PlannerMode, request: PlannerRequest): PlannerScenario {
  const items = request.items.map((name, index) => estimateItem(name, mode, request, index))
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const remaining = request.budget - total
  const status = remaining < 0 ? 'over' : remaining <= request.budget * 0.12 ? 'tight' : 'safe'

  return {
    mode,
    ...MODE_COPY[mode],
    total,
    remaining,
    status,
    items,
    recommendation: buildRecommendation(mode, request.context, remaining),
  }
}

function estimateItem(name: string, mode: PlannerMode, request: PlannerRequest, index: number): PlannerScenarioItem {
  const profile = PRICE_PROFILES.find(candidate =>
    candidate.keywords.some(keyword => name.toLowerCase().includes(keyword))
  )

  if (profile) {
    return {
      name,
      amount: mode === 'hemat' ? profile.low : mode === 'sedang' ? profile.medium : profile.high,
      note: mode === 'hemat' ? profile.lowNote : mode === 'sedang' ? profile.mediumNote : profile.highNote,
    }
  }

  const base = request.budget / Math.max(request.items.length, 1)
  const multiplier = mode === 'hemat' ? 0.55 : mode === 'sedang' ? 0.9 : 1.3
  const adjustment = index * 750

  return {
    name,
    amount: roundToNearestThousand(Math.max(5000, base * multiplier + adjustment)),
    note: mode === 'hemat'
      ? 'Gunakan opsi paling murah yang masih masuk akal.'
      : mode === 'sedang'
        ? 'Estimasi normal untuk kebutuhan ini.'
        : 'Versi lebih nyaman dengan risiko biaya naik.',
  }
}

function buildRecommendation(mode: PlannerMode, context: string, remaining: number): string {
  const normalizedContext = context.trim() || 'rencana ini'

  if (mode === 'hemat') {
    return `Untuk ${normalizedContext}, skenario ini paling aman karena masih menyisakan ruang untuk biaya tidak terduga.`
  }

  if (mode === 'sedang') {
    return remaining >= 0
      ? `Untuk ${normalizedContext}, skenario ini masih layak selama tidak ada add-on tambahan.`
      : `Untuk ${normalizedContext}, skenario ini perlu dipangkas sedikit agar kembali sesuai budget.`
  }

  return remaining >= 0
    ? `Untuk ${normalizedContext}, versi boros masih belum lewat budget, tapi cadangannya kecil.`
    : `Untuk ${normalizedContext}, versi boros melewati budget dan sebaiknya dipakai sebagai batas risiko saja.`
}

function roundToNearestThousand(value: number): number {
  return Math.round(value / 1000) * 1000
}
