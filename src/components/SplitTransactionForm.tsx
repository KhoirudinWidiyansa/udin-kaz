'use client'

import { useState, useMemo } from 'react'
import { KATEGORI_LIST } from '@/lib/validators'
import { formatRupiah } from '@/lib/formatters'

interface SplitInput {
  kategori: string
  nominal: number
  catatan: string
}

interface SplitTransactionFormProps {
  totalNominal: number
  onSubmit: (splits: SplitInput[]) => void
  onCancel: () => void
  canSubmit?: boolean
  submitError?: string
}

export default function SplitTransactionForm({ 
  totalNominal, 
  onSubmit, 
  onCancel,
  canSubmit = true,
  submitError = '',
}: SplitTransactionFormProps) {
  const [splits, setSplits] = useState<SplitInput[]>([
    { kategori: '', nominal: 0, catatan: '' },
  ])

  const splitTotal = useMemo(() => {
    return splits.reduce((sum, split) => sum + split.nominal, 0)
  }, [splits])

  const remaining = totalNominal - splitTotal

  const isValid = useMemo(() => {
    return splitTotal === totalNominal && 
      splits.every(s => s.kategori && s.nominal > 0)
  }, [splits, splitTotal, totalNominal])

  const hasTotal = totalNominal > 0
  const summaryTone = remaining === 0 ? 'safe' : remaining > 0 ? 'warning' : 'exceeded'
  const invalidSplitIndex = splits.findIndex(split => !split.kategori || split.nominal <= 0)

  const addSplit = () => {
    setSplits([...splits, { kategori: '', nominal: 0, catatan: '' }])
  }

  const removeSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index))
    }
  }

  const updateSplit = (index: number, field: keyof SplitInput, value: string | number) => {
    const newSplits = [...splits]
    newSplits[index] = { ...newSplits[index], [field]: value }
    setSplits(newSplits)
  }

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(splits.filter(s => s.kategori && s.nominal > 0))
    }
  }

  return (
    <div className="sheet-modal split-sheet" role="dialog" aria-modal="true" aria-label="Pecah transaksi">
      <button type="button" className="sheet-handle split-sheet__handle" onClick={onCancel} aria-label="Tutup pecah transaksi" />

      <div className="split-sheet__header">
        <span className="feature-eyebrow">Split transaksi</span>
        <h2 className="sheet-title">Pecah nominal ke beberapa kategori</h2>
        <p className="split-sheet__description">
          Total transaksi {formatRupiah(totalNominal)} akan dipecah menjadi beberapa baris. Pastikan semua bagian teralokasi sebelum disimpan.
        </p>
      </div>

      <section className="split-overview" aria-label="Ringkasan split">
        <div className="split-overview__row">
          <span>Total transaksi</span>
          <strong>{formatRupiah(totalNominal)}</strong>
        </div>
        <div className="split-overview__row">
          <span>Jumlah bagian</span>
          <strong>{splits.length}</strong>
        </div>
        <div className="split-overview__row">
          <span>Status</span>
          <strong>{hasTotal ? (isValid ? 'Siap disimpan' : 'Perlu dilengkapi') : 'Butuh nominal parent'}</strong>
        </div>
      </section>

      <div className="split-list">
        {splits.map((split, index) => {
          const hasFieldError = !split.kategori || split.nominal <= 0

          return (
            <section key={index} className="split-card">
              <div className="split-card__header">
                <div>
                  <span className="feature-eyebrow">Bagian {index + 1}</span>
                  <p className="split-card__title">
                    {split.kategori || 'Pilih kategori dan isi nominal'}
                  </p>
                </div>
                {splits.length > 1 && (
                  <button type="button" className="split-card__remove" onClick={() => removeSplit(index)}>
                    Hapus
                  </button>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor={`split-kategori-${index}`}>Kategori</label>
                <select
                  id={`split-kategori-${index}`}
                  className="form-select"
                  value={split.kategori}
                  onChange={e => updateSplit(index, 'kategori', e.target.value)}
                >
                  <option value="">Pilih kategori...</option>
                  {KATEGORI_LIST.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor={`split-nominal-${index}`}>Nominal (Rp)</label>
                <input
                  id={`split-nominal-${index}`}
                  type="number"
                  inputMode="numeric"
                  className="form-input nominal"
                  placeholder="0"
                  value={split.nominal || ''}
                  onChange={e => updateSplit(index, 'nominal', parseInt(e.target.value, 10) || 0)}
                />
              </div>

              <div className="form-group split-card__notes">
                <label className="form-label" htmlFor={`split-catatan-${index}`}>Catatan (opsional)</label>
                <input
                  id={`split-catatan-${index}`}
                  type="text"
                  className="form-input"
                  placeholder="Contoh: bahan masak, jajanan, transport..."
                  value={split.catatan}
                  onChange={e => updateSplit(index, 'catatan', e.target.value)}
                />
              </div>

              {hasFieldError && (
                <p className="form-error">
                  Lengkapi kategori dan isi nominal di atas Rp0 untuk bagian ini.
                </p>
              )}
            </section>
          )
        })}
      </div>

      <button type="button" className="split-add-button" onClick={addSplit}>
        + Tambah Bagian
      </button>

      <section className={`split-balance split-balance--${summaryTone}`} aria-label="Status alokasi">
        <div className="split-balance__row">
          <span>Total dialokasikan</span>
          <strong>{formatRupiah(splitTotal)}</strong>
        </div>
        <div className="split-balance__row">
          <span>{remaining >= 0 ? 'Sisa alokasi' : 'Kelebihan alokasi'}</span>
          <strong>{formatRupiah(Math.abs(remaining))}</strong>
        </div>
      </section>

      {!hasTotal && (
        <p className="form-error">
          Isi nominal transaksi utama terlebih dulu sebelum memakai split.
        </p>
      )}

      {hasTotal && remaining !== 0 && (
        <p className="form-error">
          {remaining > 0
            ? `Sisa ${formatRupiah(remaining)} belum dialokasikan.`
            : `Total split melebihi transaksi sebesar ${formatRupiah(Math.abs(remaining))}.`}
        </p>
      )}

      {hasTotal && invalidSplitIndex !== -1 && (
        <p className="form-error">
          Bagian {invalidSplitIndex + 1} belum valid. Setiap split wajib punya kategori dan nominal di atas Rp0.
        </p>
      )}

      {submitError && (
        <p className="form-error">
          {submitError}
        </p>
      )}

      <div className="split-actions">
        <button type="button" className="split-secondary-button" onClick={onCancel}>
          Batal
        </button>
        <button type="button" onClick={handleSubmit} disabled={!isValid || !hasTotal || !canSubmit} className="feature-action">
          Simpan Split
        </button>
      </div>
    </div>
  )
}
