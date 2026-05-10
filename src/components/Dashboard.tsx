'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'
import type { Transaction } from '@/lib/db'
import TransactionForm from './TransactionForm'
import { KATEGORI_LIST } from '@/lib/validators'

interface DashboardData {
  totalPengeluaran: number
  transaksi: Transaction[]
  totalCount: number
  hasMore: boolean
  categorySummary: { kategori: string; total: number }[]
}

interface DashboardProps {
  initialData: DashboardData
  fetchError: boolean
  initialAnggota: string[]
  initialMonths: string[]
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

function formatTanggal(tanggal: string): string {
  if (!tanggal) return '-'
  const dateStr = tanggal.includes('T') ? tanggal : tanggal + 'T00:00:00'
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  })
}

export default function Dashboard({ initialData, initialAnggota, fetchError, initialMonths }: DashboardProps) {
  const [data, setData] = useState<DashboardData>(initialData)
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Filters State
  const [showFilters, setShowFilters] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [sortDate, setSortDate] = useState<'desc' | 'asc'>('desc')
  const [sortNominal, setSortNominal] = useState<'desc' | 'asc' | ''>('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterBulan, setFilterBulan] = useState(() => new Date().toISOString().substring(0, 7)) // format 'YYYY-MM'
  const [minNominal, setMinNominal] = useState('')
  const [maxNominal, setMaxNominal] = useState('')

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Pagination state (Infinite Scroll)
  const [page, setPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { ref, inView } = useInView()
  const isFirstRender = useRef(true)

  const fetchData = useCallback(async (targetPage: number, replace: boolean = false) => {
    const params = new URLSearchParams({ page: String(targetPage) })
    if (filterBulan) params.set('bulan', filterBulan)
    if (filterKategori) params.set('kategori', filterKategori)
    if (minNominal) params.set('minNominal', minNominal)
    if (maxNominal) params.set('maxNominal', maxNominal)
    if (sortDate) params.set('sortDate', sortDate)
    if (sortNominal) params.set('sortNominal', sortNominal)
    
    const res = await fetch(`/api/transactions?${params}`)
    if (res.ok) {
      const fresh = await res.json()
      setData(prev => ({
        totalCount: fresh.totalCount,
        hasMore: fresh.hasMore,
        totalPengeluaran: fresh.totalPengeluaran,
        categorySummary: fresh.categorySummary,
        transaksi: replace ? fresh.transaksi : [...prev.transaksi, ...fresh.transaksi]
      }))
      setPage(targetPage)
    }
  }, [filterBulan, filterKategori, minNominal, maxNominal, sortDate, sortNominal])

  // Filter Change Debounce
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timeoutId = setTimeout(() => {
      setIsRefreshing(true)
      fetchData(1, true).finally(() => setIsRefreshing(false))
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [fetchData, sortNominal, minNominal, maxNominal])

  // Infinite Scroll Trigger
  useEffect(() => {
    if (inView && data.hasMore && !isLoadingMore && !isRefreshing) {
      setIsLoadingMore(true)
      fetchData(page + 1, false).finally(() => setIsLoadingMore(false))
    }
  }, [inView, data.hasMore, isLoadingMore, isRefreshing, page, fetchData])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  const handleTransactionAdded = useCallback(async () => {
    setShowForm(false)
    showToast('Transaksi berhasil dicatat ✓', 'success')
    setIsRefreshing(true)
    await fetchData(1, true)
    setIsRefreshing(false)
  }, [fetchData])

  // Reset pagination when month filter changes
  const handleFilterBulan = useCallback((bulan: string) => {
    setFilterBulan(bulan)
  }, [])

  const availableMonths = useMemo(() => {
    const months = new Set<string>(initialMonths);
    if (filterBulan) months.add(filterBulan);
    if (data?.transaksi) {
      data.transaksi.forEach(t => {
        if (t.tanggal) {
          const monthKey = t.tanggal.substring(0, 7);
          months.add(monthKey);
        }
      });
    }

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [data?.transaksi, initialMonths, filterBulan]);

  // Compute total pengeluaran
  const totalKeluar = data.transaksi.reduce(
    (sum, t) => sum + t.nominal,
    0
  )

  // Export handler
  const handleExport = async (bulan: string) => {
    setIsExporting(true)
    setShowExportMenu(false)
    try {
      const url = bulan ? `/api/export?bulan=${bulan}` : '/api/export'
      const res = await fetch(url)
      if (!res.ok) {
        showToast('Gagal mengexport data', 'error')
        return
      }
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const monthLabel = bulan || 'semua'
      a.download = `pengeluaran-${monthLabel}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(downloadUrl)
      showToast('File Excel berhasil diunduh ✓', 'success')
    } catch {
      showToast('Gagal mengunduh file', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      {/* Header */}
      <header className="app-header">
        <span className="app-header__title">Kas Keluarga</span>
        <span className="app-header__subtitle">Keuangan Bersama</span>
      </header>

      {/* Balance Section */}
      <section className="balance-section animate-in">
        <p className="balance-label">
          {filterBulan 
            ? `Pengeluaran ${new Date(filterBulan + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`
            : 'Total Pengeluaran'}
        </p>
        <p className="balance-amount negative">
          {formatRupiah(data.totalPengeluaran)}
        </p>
        <div className="balance-meta">
          <div className="balance-meta-item">
            <span className="balance-meta-label">Transaksi</span>
            <span className="balance-meta-value" style={{ color: 'var(--color-text)' }}>{data.totalCount} item</span>
          </div>
          <div className="balance-meta-item" style={{ position: 'relative' }}>
            <button
              className="btn-export"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              id="btn-export-excel"
            >
              {isExporting ? '⏳ Mengunduh...' : '📥 Export Excel'}
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button
                  className="export-menu-item"
                  onClick={() => handleExport('')}
                >
                  📋 Semua Bulan
                </button>
                {availableMonths.map(m => {
                  const label = new Date(m + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                  return (
                    <button
                      key={m}
                      className="export-menu-item"
                      onClick={() => handleExport(m)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Analysis Overlay */}
      {showAnalysis && (
        <>
          <div className="overlay" onClick={() => setShowAnalysis(false)} />
          <div className="sheet-modal" style={{ height: 'auto', paddingBottom: '32px' }}>
            <div className="sheet-handle" onClick={() => setShowAnalysis(false)} />
            <h2 className="sheet-title">Analisis Pengeluaran</h2>
            
            {data.categorySummary && data.categorySummary.length > 0 ? (
              <div className="analysis-grid">
                {data.categorySummary.map(item => {
                  const percentage = (item.total / data.totalPengeluaran) * 100
                  return (
                    <div key={item.kategori} className="analysis-card">
                      <div className="analysis-card-header">
                        <span className="analysis-card-title">{item.kategori}</span>
                        <span className="analysis-card-amount">{formatRupiah(item.total)}</span>
                      </div>
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
              <p style={{ textAlign: 'center', color: 'var(--color-text-dim)', padding: '24px 0' }}>
                Belum ada data untuk dianalisis
              </p>
            )}
            
            <button 
              className="btn-submit" 
              style={{ marginTop: '24px', background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
              onClick={() => setShowAnalysis(false)}
            >
              Tutup
            </button>
          </div>
        </>
      )}

      {/* Transaction List */}
      <section className="transactions-section">
        {availableMonths.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', paddingLeft: '2px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {availableMonths.map(m => {
              const label = new Date(m + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
              return (
                <button 
                  key={m}
                  onClick={() => handleFilterBulan(m)}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s',
                    background: filterBulan === m ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: filterBulan === m ? '#0a0600' : 'var(--color-text)',
                    border: filterBulan === m ? '1px solid var(--color-accent)' : '1px solid var(--color-border)'
                  }}
                >
                  {label}
                </button>
              )
            })}
            <button 
              onClick={() => handleFilterBulan('')}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer', transition: '0.2s',
                background: filterBulan === '' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: filterBulan === '' ? '#0a0600' : 'var(--color-text)',
                border: filterBulan === '' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)'
              }}
            >
              Semua Waktu
            </button>
          </div>
        )}

        <div className="section-header">
          <span className="section-label">Transaksi Terakhir</span>
          <div className="section-line" />
          <button 
            onClick={() => setShowAnalysis(true)}
            className="filter-toggle"
            style={{ 
              background: 'transparent',
              border: 'none',
              color: 'var(--color-accent)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              marginRight: '12px'
            }}
          >
            📊 Analisis
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="filter-toggle"
            style={{ 
              background: 'transparent',
              border: 'none',
              color: showFilters ? 'var(--color-accent)' : 'var(--color-text-dim)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            {showFilters ? 'Tutup Filter' : 'Filter'}
          </button>
          <span className="section-label" style={{ marginLeft: '8px' }}>{data.totalCount}</span>
        </div>

        {showFilters && (
          <div className="filters-container animate-in" style={{
            background: 'var(--color-surface)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="form-label">Urutan</label>
                <select className="form-select" value={sortNominal ? `nom-${sortNominal}` : `date-${sortDate}`} onChange={e => {
                  const val = e.target.value
                  if (val.startsWith('nom-')) {
                    setSortNominal(val.replace('nom-', '') as 'desc' | 'asc')
                    setSortDate('desc')
                  } else {
                    setSortNominal('')
                    setSortDate(val.replace('date-', '') as 'desc' | 'asc')
                  }
                }} style={{ padding: '8px', fontSize: '0.8rem' }}>
                  <option value="date-desc">Terbaru</option>
                  <option value="date-asc">Terlama</option>
                  <option value="nom-desc">Nominal Terbesar</option>
                  <option value="nom-asc">Nominal Terkecil</option>
                </select>
              </div>
              <div>
                <label className="form-label">Kategori</label>
                <select className="form-select" value={filterKategori} onChange={e => setFilterKategori(e.target.value)} style={{ padding: '8px', fontSize: '0.8rem' }}>
                  <option value="">Semua Kategori</option>
                  {KATEGORI_LIST.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Min Nominal</label>
                <input type="number" className="form-input" placeholder="Min..." value={minNominal} onChange={e => setMinNominal(e.target.value)} style={{ padding: '8px', fontSize: '0.8rem' }} />
              </div>
              <div>
                <label className="form-label">Max Nominal</label>
                <input type="number" className="form-input" placeholder="Max..." value={maxNominal} onChange={e => setMaxNominal(e.target.value)} style={{ padding: '8px', fontSize: '0.8rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => { setSortDate('desc'); setSortNominal(''); setFilterKategori(''); setMinNominal(''); setMaxNominal(''); }}
                style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {fetchError && (
          <div className="empty-state">
            <p>⚠ Koneksi ke database gagal</p>
            <p style={{ marginTop: '8px', color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>
              Pastikan environment variables sudah dikonfigurasi
            </p>
          </div>
        )}

        {(!isRefreshing && data.transaksi.length === 0) && (
          <div className="empty-state">
            <p>Belum ada transaksi</p>
            <p style={{ marginTop: '8px', color: 'var(--color-text-dim)', fontSize: '0.65rem' }}>
              Tekan tombol di bawah untuk mulai mencatat
            </p>
          </div>
        )}

        {data.transaksi.length > 0 && (
          <div className="stagger-children" style={{ opacity: isRefreshing ? 0.5 : 1, transition: 'opacity 0.2s' }}>
            {data.transaksi.map((t) => (
              <div key={t.id || t.created_at} className="transaction-item animate-in">
                <div className="transaction-dot keluar" />
                <div className="transaction-info">
                  <p className="transaction-name">{t.nama}</p>
                  <div className="transaction-meta">
                    <span className="transaction-kategori">{t.kategori}</span>
                    <span className="transaction-date">{formatTanggal(t.tanggal)}</span>
                    {t.catatan && (
                      <span className="transaction-date" style={{ fontStyle: 'italic' }}>
                        · {t.catatan.slice(0, 20)}{t.catatan.length > 20 ? '…' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div className="transaction-amount keluar">
                    -{formatRupiah(t.nominal)}
                  </div>
                  <button 
                    onClick={() => setDeletingId(t.id)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--color-error)',
                      fontSize: '0.75rem', cursor: 'pointer', opacity: 0.7,
                      textDecoration: 'underline'
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Skeleton Loaders / Spinner */}
        {data.hasMore && (
          <div ref={ref} style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)', fontWeight: 500, letterSpacing: '0.05em' }}>
              {isLoadingMore ? '⏳ Memuat data...' : ''}
            </span>
          </div>
        )}
      </section>

      {/* FAB - Add Transaction */}
      <div className="form-trigger">
        <button
          className="btn-add"
          onClick={() => setShowForm(true)}
          id="btn-tambah-transaksi"
        >
          + Catat Pengeluaran
        </button>
      </div>

      {/* Transaction Form Modal */}
      {showForm && (
        <>
          <div className="overlay" onClick={() => setShowForm(false)} />
          <TransactionForm
            onSuccess={handleTransactionAdded}
            onClose={() => setShowForm(false)}
            initialAnggota={initialAnggota}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <>
          <div className="overlay" style={{ zIndex: 1000 }} onClick={() => !isDeleting && setDeletingId(null)} />
          <div className="sheet-modal" style={{ zIndex: 1001, height: 'auto', paddingBottom: '32px' }} role="dialog">
            <h2 className="sheet-title" style={{ color: 'var(--color-error)' }}>⚠ Hapus Transaksi</h2>
            {data.transaksi.find(t => t.id === deletingId) && (
              <>
                <p style={{ color: 'var(--color-text-dim)', marginBottom: '16px' }}>
                  Transaksi akan dihapus permanen. Untuk mencegah ketidaksengajaan, harap ketik ulang nominal di bawah ini.
                </p>
                <div style={{ marginBottom: '16px', background: 'var(--color-bg)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <p><strong>{data.transaksi.find(t => t.id === deletingId)?.nama}</strong> — {data.transaksi.find(t => t.id === deletingId)?.kategori}</p>
                  <p className="transaction-amount keluar">
                    {formatRupiah(data.transaksi.find(t => t.id === deletingId)?.nominal || 0)}
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Ketik: {data.transaksi.find(t => t.id === deletingId)?.nominal}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-input"
                    value={deleteConfirmInput}
                    onChange={(e) => setDeleteConfirmInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 150000"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
                  <button
                    className="btn-submit"
                    style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                    onClick={() => { setDeletingId(null); setDeleteConfirmInput(''); }}
                    disabled={isDeleting}
                  >
                    Batal
                  </button>
                  <button
                    className="btn-submit btn-error"
                    disabled={deleteConfirmInput !== String(data.transaksi.find(t => t.id === deletingId)?.nominal) || isDeleting}
                    onClick={async () => {
                      setIsDeleting(true)
                      try {
                        const res = await fetch(`/api/transactions/${deletingId}`, { method: 'DELETE' })
                        if (res.ok) {
                          showToast('Transaksi dihapus', 'success')
                          const deletedTx = data.transaksi.find(t => t.id === deletingId)
                          if (deletedTx) {
                            setData(prev => {
                              const newTransaksi = prev.transaksi.filter(t => t.id !== deletingId)
                              const newTotal = prev.totalPengeluaran - deletedTx.nominal
                              return { ...prev, totalPengeluaran: newTotal, transaksi: newTransaksi, totalCount: prev.totalCount - 1 }
                            })
                          }
                          setDeletingId(null)
                          setDeleteConfirmInput('')
                        } else {
                          showToast('Gagal menghapus transaksi', 'error')
                        }
                      } catch {
                        showToast('Error koneksi', 'error')
                      } finally {
                        setIsDeleting(false)
                      }
                    }}
                  >
                    {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`toast ${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </>
  )
}
