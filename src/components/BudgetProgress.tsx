'use client'

import { useState, useEffect } from 'react'
import { formatRupiah } from '@/lib/formatters'
import { KATEGORI_LIST } from '@/lib/validators'

interface BudgetProgressData {
  kategori: string
  limit: number
  spent: number
  percentage: number
  status: 'safe' | 'warning' | 'exceeded'
}

interface BudgetProgressProps {
  initialData?: BudgetProgressData[]
  onBudgetChange?: () => void
}

export default function BudgetProgress({ initialData = [], onBudgetChange }: BudgetProgressProps) {
  const [budgets, setBudgets] = useState<BudgetProgressData[]>(initialData)
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [currentMonth, setCurrentMonth] = useState('')

  useEffect(() => {
    const month = new Date().toISOString().substring(0, 7)
    setCurrentMonth(month)
    fetchBudgets(month)
  }, [])

  const fetchBudgets = async (bulan: string) => {
    try {
      const res = await fetch(`/api/budget?bulan=${bulan}&progress=true`)
      if (res.ok) {
        const data = await res.json()
        setBudgets(data.progress || [])
      }
    } catch (err) {
      console.error('Failed to fetch budgets:', err)
    }
  }

  const handleSetBudget = async (kategori: string) => {
    const limit = editValues[kategori]
    if (!limit || limit <= 0) return

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori, limit, bulan: currentMonth }),
      })

      if (res.ok) {
        fetchBudgets(currentMonth)
        setIsEditing(false)
        setEditValues({})
        onBudgetChange?.()
      }
    } catch (err) {
      console.error('Failed to set budget:', err)
    }
  }

  const handleDeleteBudget = async (kategori: string) => {
    try {
      const res = await fetch(`/api/budget?kategori=${kategori}&bulan=${currentMonth}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchBudgets(currentMonth)
        onBudgetChange?.()
      }
    } catch (err) {
      console.error('Failed to delete budget:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded': return 'var(--color-error)'
      case 'warning': return 'var(--color-accent)'
      default: return 'var(--color-success)'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'exceeded': return 'Melampaui'
      case 'warning': return 'Hampir Habis'
      default: return 'Aman'
    }
  }

  return (
    <div className="budget-progress-container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Budget per Kategori</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text)',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {isEditing ? 'Selesai' : 'Atur Budget'}
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="empty-state" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', marginBottom: '12px' }}>
            Belum ada budget yang diatur
          </p>
          <p style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}>
            Klik &quot;Atur Budget&quot; untuk mulai mengatur limit pengeluaran per kategori
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {budgets.map(budget => (
            <div
              key={budget.kategori}
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                border: `1px solid ${getStatusColor(budget.status)}40`,
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ fontWeight: 500 }}>{budget.kategori}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: `${getStatusColor(budget.status)}20`,
                    color: getStatusColor(budget.status),
                  }}>
                    {getStatusLabel(budget.status)}
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => handleDeleteBudget(budget.kategori)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-error)',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{
                height: '8px',
                background: 'var(--color-bg)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <div
                  style={{
                    width: `${Math.min(budget.percentage, 100)}%`,
                    height: '100%',
                    background: getStatusColor(budget.status),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--color-text-dim)'
              }}>
                <span>{formatRupiah(budget.spent)} / {formatRupiah(budget.limit)}</span>
                <span>{budget.percentage.toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Budget Section */}
      {isEditing && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '12px' }}>
            Tambah Budget Baru
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {KATEGORI_LIST.filter(k => !budgets.find(b => b.kategori === k)).map(kategori => (
              <div
                key={kategori}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span style={{ flex: 1, fontSize: '0.85rem' }}>{kategori}</span>
                <input
                  type="number"
                  placeholder="Limit..."
                  value={editValues[kategori] || ''}
                  onChange={e => setEditValues(prev => ({
                    ...prev,
                    [kategori]: parseInt(e.target.value) || 0
                  }))}
                  style={{
                    width: '100px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  onClick={() => handleSetBudget(kategori)}
                  disabled={!editValues[kategori] || editValues[kategori] <= 0}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: 'var(--color-accent)',
                    color: '#0a0600',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: editValues[kategori] ? 1 : 0.5,
                  }}
                >
                  Simpan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
