'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CategorySummary, Transaction } from '@/lib/db'
import { formatRupiah } from '@/lib/formatters'
import { generateMonthlyInsight } from '@/lib/insights'
import { parsePlannerItems, type PlannerScenario } from '@/lib/planner'
import { parseAmount } from '@/lib/receiptParser'
import TrendChart from './TrendChart'
import BudgetProgress from './BudgetProgress'

interface DashboardData {
  totalPengeluaran: number
  transaksi: Transaction[]
  totalCount: number
  hasMore: boolean
  categorySummary: CategorySummary[]
}

interface InsightViewProps {
  data: DashboardData
}

const INSIGHT_TARGET_STORAGE_KEY = 'kas_keluarga_monthly_target'

function formatDisplayNominal(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(Number(digits))
}

const PLANNER_CACHE_KEY = 'kas_keluarga_planner_cache'

export function PlannerView() {
  const [context, setContext] = useState('')
  const [budget, setBudget] = useState('')
  const [itemsText, setItemsText] = useState('')
  const [activeBudget, setActiveBudget] = useState(0)
  const [activeItemsCount, setActiveItemsCount] = useState(0)
  const [scenarios, setScenarios] = useState<PlannerScenario[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const cached = sessionStorage.getItem(PLANNER_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        return parsed.scenarios || []
      }
    } catch { /* ignore */ }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const plannerItems = parsePlannerItems(itemsText)
  const budgetAmount = parseAmount(budget)

  // Restore cached summary on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(PLANNER_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setActiveBudget(parsed.budget || 0)
        setActiveItemsCount(parsed.itemsCount || 0)
      }
    } catch { /* ignore */ }
  }, [])

  // Fetch scenarios from Gemini API
  const handleGenerateScenarios = async (ctx: string, bgt: number, itemsList: string[]) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: ctx, budget: bgt, items: itemsList }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload.error || 'Gagal menghasilkan skenario anggaran.')
        return
      }
      const newScenarios = payload.scenarios || []
      setScenarios(newScenarios)
      setActiveBudget(bgt)
      setActiveItemsCount(itemsList.length)
      // Cache result
      try {
        sessionStorage.setItem(PLANNER_CACHE_KEY, JSON.stringify({ scenarios: newScenarios, budget: bgt, itemsCount: itemsList.length }))
      } catch { /* ignore */ }
    } catch {
      setError('Koneksi AI Planner gagal. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    if (budgetAmount <= 0) {
      setError('Budget wajib diisi')
      return
    }

    if (plannerItems.length === 0) {
      setError('Tambahkan minimal satu item')
      return
    }

    setError('')
    handleGenerateScenarios(
      context.trim() || 'Rencana pengeluaran',
      budgetAmount,
      plannerItems
    )
  }

  return (
    <section className="tab-view animate-in">
      <div className="feature-panel">
        <div className="feature-panel__header">
          <div>
            <span className="feature-eyebrow">AI planner</span>
            <h2 className="feature-title">Rencana pengeluaran</h2>
          </div>
          <span className="status-pill">Gemini AI</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="planner-context">Konteks</label>
            <textarea
              id="planner-context"
              className="form-textarea planner-context"
              value={context}
              onChange={event => setContext(event.target.value)}
              maxLength={160}
            />
          </div>

          <div className="planner-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="planner-budget">Budget (Rp)</label>
              <input
                id="planner-budget"
                type="text"
                inputMode="numeric"
                className="form-input nominal"
                value={formatDisplayNominal(budget)}
                onChange={event => setBudget(event.target.value.replace(/\D/g, ''))}
                placeholder="60.000"
              />
            </div>
            <div className="planner-budget-card">
              <span>Item</span>
              <strong>{plannerItems.length}</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="planner-items">Item tambahan</label>
            <textarea
              id="planner-items"
              className="form-textarea planner-items"
              value={itemsText}
              onChange={event => setItemsText(event.target.value)}
              placeholder={`Kopi\nAir mineral\nMakanan ringan`}
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="feature-action feature-action--full" disabled={isLoading}>
            {isLoading ? 'Memproses dengan Gemini AI...' : 'Buat Skenario'}
          </button>
        </form>
      </div>

      <div className="planner-summary">
        <div>
          <span className="feature-eyebrow">Budget aktif</span>
          <strong>{formatRupiah(activeBudget)}</strong>
        </div>
        <div>
          <span className="feature-eyebrow">Rencana</span>
          <strong>{activeItemsCount} item</strong>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state animate-pulse" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', padding: '2.5rem', textAlign: 'center', borderRadius: '12px' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>🤖 Sedang meminta saran cerdas dari Gemini AI...</p>
        </div>
      ) : scenarios.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', padding: '2.5rem', textAlign: 'center', borderRadius: '12px' }}>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Isi form di atas lalu klik <strong>&quot;Buat Skenario&quot;</strong> untuk meminta saran AI</p>
        </div>
      ) : (
        <div className="scenario-grid">
          {scenarios.map(scenario => (
            <article key={scenario.mode} className={`scenario-card scenario-card--${scenario.mode}`}>
              <div className="scenario-card__header">
                <div>
                  <span>{scenario.title}</span>
                  <strong>{scenario.description}</strong>
                </div>
                <div className={`scenario-status scenario-status--${scenario.status}`}>
                  {scenario.remaining >= 0 ? 'Aman' : 'Over'}
                </div>
              </div>

              <div className="scenario-total">
                <span>Total</span>
                <strong>{formatRupiah(scenario.total)}</strong>
              </div>

              <div className="scenario-delta">
                {scenario.remaining >= 0
                  ? `Sisa ${formatRupiah(scenario.remaining)}`
                  : `Over ${formatRupiah(Math.abs(scenario.remaining))}`}
              </div>

              <div className="scenario-items">
                {scenario.items.map(item => (
                  <div key={`${scenario.mode}-${item.name}`} className="scenario-item">
                    <div>
                      <p>{item.name}</p>
                      <span>{item.note}</span>
                    </div>
                    <strong>{formatRupiah(item.amount)}</strong>
                  </div>
                ))}
              </div>

              <p className="scenario-recommendation">{scenario.recommendation}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

const INSIGHT_CACHE_KEY = 'kas_keluarga_insight_cache'

export function InsightView({ data }: InsightViewProps) {
  const hasData = data.categorySummary.length > 0
  const suggestedTarget = useMemo(() => (
    data.totalPengeluaran > 0 ? Math.ceil(data.totalPengeluaran / 100000) * 100000 : 0
  ), [data.totalPengeluaran])
  const [targetInput, setTargetInput] = useState(() => suggestedTarget ? String(suggestedTarget) : '')
  const monthlyTarget = parseAmount(targetInput)

  // Local insight (instant, no AI call)
  const localInsight = useMemo(() => generateMonthlyInsight({
    monthlyTarget,
    totalPengeluaran: data.totalPengeluaran,
    totalCount: data.totalCount,
    categorySummary: data.categorySummary,
    transaksi: data.transaksi,
  }), [data, monthlyTarget])

  // AI insight (cached in sessionStorage, only fetched on explicit button click)
  const [aiInsight, setAiInsight] = useState<any>(() => {
    if (typeof window === 'undefined') return null
    try {
      const cached = sessionStorage.getItem(INSIGHT_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch { /* ignore */ }
    return null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Use AI insight for recommendations if available, otherwise local
  const activeInsight = aiInsight || localInsight
  const ratioLabel = activeInsight?.ratio ? `${Math.round(activeInsight.ratio * 100)}%` : '-'

  useEffect(() => {
    if (typeof window === 'undefined') return

    const savedTarget = window.localStorage.getItem(INSIGHT_TARGET_STORAGE_KEY)
    if (savedTarget) {
      setTargetInput(savedTarget)
      return
    }

    if (suggestedTarget > 0) {
      setTargetInput(String(suggestedTarget))
    }
  }, [suggestedTarget])

  const handleTargetSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (typeof window === 'undefined') return
    window.localStorage.setItem(INSIGHT_TARGET_STORAGE_KEY, String(monthlyTarget))
  }

  const triggerAiAnalysis = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyTarget,
          totalPengeluaran: data.totalPengeluaran,
          totalCount: data.totalCount,
          categorySummary: data.categorySummary,
          transaksi: data.transaksi,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload.error || 'Gagal memproses analisis keuangan.')
        return
      }
      setAiInsight(payload.insight)
      // Cache AI result
      try {
        sessionStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(payload.insight))
      } catch { /* ignore */ }
    } catch {
      setError('Koneksi AI Insights gagal. Silakan coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="tab-view animate-in">
      {/* Trend Chart Section */}
      <div className="feature-panel">
        <div className="feature-panel__header">
          <div>
            <span className="feature-eyebrow">Tren</span>
            <h2 className="feature-title">Grafik Pengeluaran</h2>
          </div>
        </div>
        {data.transaksi.length > 0 ? (
          <TrendChart 
            transactions={data.transaksi} 
            filterKategori={undefined}
            filterNama={undefined}
          />
        ) : (
          <div className="empty-state empty-state--compact">
            <p>Belum ada data transaksi</p>
          </div>
        )}
      </div>

      {/* Budget Progress Section */}
      <BudgetProgress />

      {/* Monthly Target & Benchmark Section */}
      <div className="feature-panel">
        <div className="feature-panel__header">
          <div>
            <span className="feature-eyebrow">Insight</span>
            <h2 className="feature-title">Analisis bulanan</h2>
          </div>
          <span className="status-pill">{aiInsight ? 'Gemini AI' : 'Lokal'}</span>
        </div>

        <form className="insight-target-form" onSubmit={handleTargetSubmit}>
          <div>
            <label className="form-label" htmlFor="monthly-target">Target pengeluaran</label>
            <input
              id="monthly-target"
              type="text"
              inputMode="numeric"
              className="form-input"
              value={formatDisplayNominal(targetInput)}
              onChange={event => setTargetInput(event.target.value.replace(/\D/g, ''))}
              placeholder="2.000.000"
            />
          </div>
          <button type="submit" className="feature-action">
            Simpan
          </button>
        </form>
      </div>

      {/* Benchmark card — always visible using local or AI data */}
      <div className={`benchmark-card benchmark-card--${activeInsight.severity}`}>
        <div className="benchmark-card__header">
          <div>
            <span className="feature-eyebrow">Benchmark</span>
            <p className="benchmark-status">{activeInsight.status}</p>
          </div>
          <strong>{ratioLabel}</strong>
        </div>
        <p className="benchmark-headline">{activeInsight.headline}</p>
        <div className="benchmark-meter" aria-hidden="true">
          <span style={{ width: `${activeInsight.score}%` }} />
        </div>
        <div className="insight-metrics">
          <div>
            <span>Aktual</span>
            <strong>{formatRupiah(data.totalPengeluaran)}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>{monthlyTarget > 0 ? formatRupiah(monthlyTarget) : '-'}</strong>
          </div>
        </div>
      </div>

      {/* AI Recommendations — manual trigger */}
      <div className="feature-panel">
        <div className="feature-panel__header">
          <div>
            <span className="feature-eyebrow">Rekomendasi {aiInsight ? 'AI' : ''}</span>
            <h2 className="feature-title">Prioritas bulan depan</h2>
          </div>
        </div>

        <div className="recommendation-list">
          {activeInsight.recommendations.map((recommendation: any) => (
            <article key={`${recommendation.type}-${recommendation.title}`} className={`recommendation-card recommendation-card--${recommendation.severity}`}>
              <div className="recommendation-card__header">
                <span>{recommendation.type === 'reduce' ? 'Bisa Dikurangi' : 'Audit Pengeluaran'}</span>
                {recommendation.potentialSaving > 0 && (
                  <strong>{formatRupiah(recommendation.potentialSaving)}</strong>
                )}
              </div>
              <h3>{recommendation.title}</h3>
              <p>{recommendation.detail}</p>
            </article>
          ))}
        </div>

        {error && <p className="form-error" style={{ marginTop: '0.75rem' }}>{error}</p>}

        <button
          type="button"
          className="feature-action feature-action--full"
          onClick={triggerAiAnalysis}
          disabled={isLoading}
          style={{ marginTop: '1rem' }}
        >
          {isLoading ? '🔮 Menganalisis dengan Gemini AI...' : aiInsight ? '🔄 Minta Analisis AI Ulang' : '🔮 Minta Analisis Mendalam dari AI'}
        </button>
      </div>

      <div className="feature-panel">
        <div className="feature-panel__header">
          <div>
            <span className="feature-eyebrow">Kategori</span>
            <h2 className="feature-title">Sebaran pengeluaran</h2>
          </div>
        </div>

        {hasData ? (
          <div className="analysis-grid">
            {(activeInsight?.topCategories || data.categorySummary).map((item: any) => {
              const count = item.count ?? data.transaksi.filter(t => t.kategori === item.kategori).length
              const percentage = item.percentage ?? (data.totalPengeluaran > 0 ? (item.total / data.totalPengeluaran) * 100 : 0)
              return (
                <div key={item.kategori} className="analysis-card">
                  <div className="analysis-card-header">
                    <span className="analysis-card-title">{item.kategori}</span>
                    <span className="analysis-card-amount">{formatRupiah(item.total)}</span>
                  </div>
                  <p className="analysis-card-meta">{count} transaksi / {Math.round(percentage)}%</p>
                  <div className="analysis-bar-bg">
                    <div
                      className="analysis-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="empty-state empty-state--compact">
            <p>Belum ada data untuk dianalisis</p>
          </div>
        )}
      </div>
    </section>
  )
}
