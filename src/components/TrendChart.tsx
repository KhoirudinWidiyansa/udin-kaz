'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Transaction } from '@/lib/db'
import { parseTrendData, formatTimePeriod, type ViewMode } from '@/lib/trendParser'
import { formatRupiah } from '@/lib/formatters'

interface TrendChartProps {
  transactions: Transaction[]
  filterKategori?: string
  filterNama?: string
}

function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}jt`
  }

  if (value >= 1_000) {
    return `Rp${Math.round(value / 1_000)}rb`
  }

  return `Rp${value}`
}

export default function TrendChart({ transactions, filterKategori, filterNama }: TrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')

  const data = useMemo(() => {
    return parseTrendData(transactions, viewMode, filterKategori, filterNama).map(point => ({
      ...point,
      label: formatTimePeriod(point.time_period, viewMode),
    }))
  }, [transactions, viewMode, filterKategori, filterNama])

  const totalSpending = useMemo(
    () => data.reduce((sum, item) => sum + item.total_spending, 0),
    [data]
  )

  if (data.length === 0) {
    return (
      <div className="empty-state empty-state--compact">
        <p>Belum ada data untuk ditampilkan</p>
      </div>
    )
  }

  return (
    <div className="trend-chart">
      <div className="trend-chart__toolbar">
        {(['daily', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            type="button"
            className={`trend-chart__toggle${viewMode === mode ? ' is-active' : ''}`}
            onClick={() => setViewMode(mode)}
          >
            {mode === 'daily' ? 'Harian' : mode === 'weekly' ? 'Mingguan' : 'Bulanan'}
          </button>
        ))}
      </div>

      <div className="trend-chart__canvas">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={data}
            margin={{ top: 12, right: 8, left: -24, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--color-text-dim)"
              tickLine={false}
              axisLine={false}
              minTickGap={24}
              tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
            />
            <YAxis
              stroke="var(--color-text-dim)"
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={value => formatCompactRupiah(Number(value))}
              tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text)',
                fontSize: '12px',
              }}
              labelStyle={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              formatter={(value) => [formatRupiah(Number(value) || 0), 'Pengeluaran']}
            />
            <Line
              type="monotone"
              dataKey="total_spending"
              stroke="var(--color-accent)"
              strokeWidth={3}
              dot={{ r: 3, fill: 'var(--color-accent)', stroke: 'var(--color-bg)', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: 'var(--color-accent)', stroke: 'var(--color-text)', strokeWidth: 1 }}
              animationDuration={320}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="trend-chart__summary">
        <div>
          <span>Total</span>
          <strong>{formatRupiah(totalSpending)}</strong>
        </div>
        <div>
          <span>Rata-rata</span>
          <strong>{formatRupiah(Math.round(totalSpending / data.length))}</strong>
        </div>
        <div>
          <span>Periode</span>
          <strong>{data.length}</strong>
        </div>
      </div>
    </div>
  )
}
