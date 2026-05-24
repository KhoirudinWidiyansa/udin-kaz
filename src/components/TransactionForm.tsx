'use client'

import { useEffect, useRef, useState } from 'react'
import { KATEGORI_LIST } from '@/lib/validators'
import type { TransactionDraft } from '@/lib/transactionDrafts'
import SplitTransactionForm from './SplitTransactionForm'

const STORAGE_KEY_NAMA = 'kas_keluarga_nama'

interface TransactionFormProps {
  onSuccess: () => void
  onClose: () => void
  initialAnggota: string[]
  initialDraft?: TransactionDraft | null
}

function formatDisplayNominal(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10))
}

export default function TransactionForm({ onSuccess, onClose, initialAnggota, initialDraft }: TransactionFormProps) {
  const [nominal, setNominal] = useState(() => initialDraft?.nominal ? String(initialDraft.nominal) : '')
  const [kategori, setKategori] = useState(() => initialDraft?.kategori ?? '')
  const [nama, setNama] = useState(() => initialDraft?.nama ?? '')
  const [tanggal, setTanggal] = useState(() => initialDraft?.tanggal ?? new Date().toISOString().split('T')[0])
  const [catatan, setCatatan] = useState(() => initialDraft?.catatan ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [anggotaList, setAnggotaList] = useState<string[]>(initialAnggota)
  const [isAddingAnggota, setIsAddingAnggota] = useState(false)
  const [newAnggotaName, setNewAnggotaName] = useState('')
  const [isSplitMode, setIsSplitMode] = useState(false)

  const nominalRef = useRef<HTMLInputElement>(null)
  const hasNominal = Boolean(nominal && parseInt(nominal, 10) > 0)
  const splitSubmitError = !hasNominal
    ? 'Isi nominal transaksi utama terlebih dulu sebelum menyimpan split.'
    : !nama.trim()
      ? 'Pilih nama anggota di form utama sebelum menyimpan split.'
      : !tanggal
        ? 'Isi tanggal transaksi di form utama sebelum menyimpan split.'
        : ''

  useEffect(() => {
    fetch('/api/anggota', { cache: 'no-store', headers: { Accept: 'application/json' } })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAnggotaList(data)
        }
      })
      .catch(err => console.error('[anggota] error:', err))
  }, [])

  useEffect(() => {
    const savedNama = localStorage.getItem(STORAGE_KEY_NAMA)
    if (!initialDraft?.nama && savedNama) {
      setNama(savedNama)
    }

    setTimeout(() => nominalRef.current?.focus(), 100)
  }, [initialDraft?.nama])

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setNominal(raw)
    if (errors.nominal) {
      setErrors(prev => ({ ...prev, nominal: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const newErrors: Record<string, string> = {}
    if (!nominal || parseInt(nominal, 10) <= 0) newErrors.nominal = 'Nominal wajib diisi'
    if (!kategori) newErrors.kategori = 'Pilih kategori'
    if (!nama.trim()) newErrors.nama = 'Pilih atau masukkan nama anggota'
    if (!tanggal) newErrors.tanggal = 'Tanggal wajib diisi'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/add-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenis: 'pengeluaran',
          nominal: parseInt(nominal, 10),
          kategori,
          nama: nama.trim(),
          tanggal,
          catatan: catatan.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.details) {
          const fieldErrors: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(data.details)) {
            fieldErrors[key] = (msgs as string[])[0]
          }
          setErrors(fieldErrors)
        } else {
          setErrors({ _form: data.error || 'Terjadi kesalahan' })
        }
        return
      }

      localStorage.setItem(STORAGE_KEY_NAMA, nama.trim())

      if (!anggotaList.includes(nama.trim())) {
        setAnggotaList(prev => [...prev, nama.trim()])
      }

      onSuccess()
    } catch {
      setErrors({ _form: 'Gagal terhubung ke server. Coba lagi.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="sheet-modal transaction-sheet" role="dialog" aria-modal="true" aria-label="Form tambah transaksi">
      <button type="button" className="sheet-handle transaction-sheet__handle" onClick={onClose} aria-label="Tutup form transaksi" />

      <div className="transaction-sheet__header">
        <span className="feature-eyebrow">{initialDraft ? 'Review draft' : 'Input manual'}</span>
        <h2 className="sheet-title">{initialDraft ? 'Review Draft Transaksi' : 'Catat Transaksi'}</h2>
        <p className="transaction-sheet__description">
          Mulai dari nominal, lalu rapikan kategori, anggota, dan konteks transaksi. Form ini sengaja dibuat ringkas supaya cepat dipindai saat input.
        </p>
      </div>

      {initialDraft && (
        <div className="draft-source-banner">
          <span>{initialDraft.sourceLabel}</span>
          <strong>Editable sebelum simpan</strong>
        </div>
      )}

      <section className="transaction-overview" aria-label="Ringkasan transaksi">
        <div className="transaction-overview__row">
          <span>Status input</span>
          <strong>{initialDraft ? 'Draft siap review' : 'Transaksi baru'}</strong>
        </div>
        <div className="transaction-overview__row">
          <span>Nominal saat ini</span>
          <strong>{hasNominal ? `Rp ${formatDisplayNominal(nominal)}` : 'Belum diisi'}</strong>
        </div>
      </section>

      <form onSubmit={handleSubmit} noValidate className="transaction-form">
        <div className="form-group">
          <label className="form-label" htmlFor="input-nominal">Nominal (Rp)</label>
          <input
            ref={nominalRef}
            id="input-nominal"
            type="text"
            inputMode="numeric"
            className="form-input nominal"
            placeholder="0"
            value={formatDisplayNominal(nominal)}
            onChange={handleNominalChange}
            autoComplete="off"
          />
          {errors.nominal && <p className="form-error">{errors.nominal}</p>}
        </div>

        <div className="form-group">
          <div className="transaction-form__label-row">
            <label className="form-label" htmlFor="select-kategori">Kategori</label>
            <button
              type="button"
              className={`transaction-split-toggle${isSplitMode ? ' is-active' : ''}`}
              onClick={() => setIsSplitMode(!isSplitMode)}
            >
              {isSplitMode ? 'Mode split aktif' : 'Pakai split'}
            </button>
          </div>

          {!isSplitMode ? (
            <select
              id="select-kategori"
              className="form-select"
              value={kategori}
              onChange={e => {
                setKategori(e.target.value)
                setErrors(prev => ({ ...prev, kategori: '' }))
              }}
            >
              <option value="">Pilih kategori...</option>
              {KATEGORI_LIST.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          ) : (
            <div className="transaction-split-callout">
              <span className="feature-eyebrow">Split aktif</span>
              <p>Transaksi akan disimpan sebagai beberapa baris sesuai pembagian kategori di panel split.</p>
            </div>
          )}

          {errors.kategori && <p className="form-error">{errors.kategori}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="select-nama">Nama Anggota</label>
          {isAddingAnggota ? (
            <div className="transaction-inline-entry">
              <input
                type="text"
                className="form-input"
                placeholder="Masukkan nama baru..."
                value={newAnggotaName}
                onChange={e => setNewAnggotaName(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="transaction-inline-entry__action"
                onClick={async () => {
                  const cleanedName = newAnggotaName.trim()

                  if (cleanedName) {
                    if (!anggotaList.includes(cleanedName)) {
                      try {
                        const res = await fetch('/api/anggota', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ nama: cleanedName }),
                        })

                        if (res.ok) {
                          setAnggotaList(prev => [...prev, cleanedName])
                        }
                      } catch {
                        console.error('Failed to save anggota')
                      }
                    }

                    setNama(cleanedName)
                    setErrors(prev => ({ ...prev, nama: '' }))
                  } else if (!nama) {
                    setNama('')
                  }

                  setIsAddingAnggota(false)
                  setNewAnggotaName('')
                }}
              >
                Simpan
              </button>
            </div>
          ) : (
            <select
              id="select-nama"
              className="form-select"
              value={nama}
              onChange={e => {
                if (e.target.value === '__add__') {
                  setIsAddingAnggota(true)
                } else {
                  setNama(e.target.value)
                  setErrors(prev => ({ ...prev, nama: '' }))
                }
              }}
            >
              <option value="">Pilih nama...</option>
              {anggotaList.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="__add__">+ Tambah Anggota Baru...</option>
            </select>
          )}
          {errors.nama && <p className="form-error">{errors.nama}</p>}
        </div>

        <div className="transaction-form__grid">
          <div className="form-group">
            <label className="form-label" htmlFor="input-tanggal">Tanggal</label>
            <input
              id="input-tanggal"
              type="date"
              className="form-input"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
            {errors.tanggal && <p className="form-error">{errors.tanggal}</p>}
          </div>

          <div className="transaction-form__mini-card">
            <span className="feature-eyebrow">Mode</span>
            <strong>{isSplitMode ? 'Split kategori' : 'Satu kategori'}</strong>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="input-catatan">Catatan (opsional)</label>
          <textarea
            id="input-catatan"
            className="form-textarea"
            placeholder="Contoh: beli sembako di pasar..."
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            maxLength={200}
          />
        </div>

        {errors._form && <p className="form-error transaction-form__form-error">{errors._form}</p>}

        <div className="transaction-form__actions">
          <button type="button" className="split-secondary-button" onClick={onClose}>
            Batal
          </button>
          <button
            type="submit"
            id="btn-submit-transaksi"
            className="feature-action"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : initialDraft ? 'Simpan Draft' : 'Catat Sekarang'}
          </button>
        </div>
      </form>

      {isSplitMode && (
        <>
          <div className="overlay" onClick={() => setIsSplitMode(false)} />
          <SplitTransactionForm
            totalNominal={parseInt(nominal, 10) || 0}
            canSubmit={!splitSubmitError}
            submitError={splitSubmitError}
            onSubmit={async (splits) => {
              if (splitSubmitError) {
                setErrors(prev => ({
                  ...prev,
                  nominal: !hasNominal ? 'Nominal wajib diisi' : prev.nominal || '',
                  nama: !nama.trim() ? 'Pilih atau masukkan nama anggota' : prev.nama || '',
                  tanggal: !tanggal ? 'Tanggal wajib diisi' : prev.tanggal || '',
                }))
                return
              }

              try {
                const res = await fetch('/api/add-transaction', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jenis: 'pengeluaran',
                    nominal: parseInt(nominal, 10),
                    kategori: 'Lainnya',
                    nama: nama.trim(),
                    tanggal,
                    catatan: catatan.trim(),
                    isSplit: true,
                    splits,
                  }),
                })

                if (res.ok) {
                  localStorage.setItem(STORAGE_KEY_NAMA, nama.trim())

                  if (!anggotaList.includes(nama.trim())) {
                    setAnggotaList(prev => [...prev, nama.trim()])
                  }

                  setIsSplitMode(false)
                  onSuccess()
                } else {
                  const data = await res.json()
                  setErrors({ _form: data.error || 'Gagal menyimpan transaksi.' })
                }
              } catch {
                setErrors({ _form: 'Gagal terhubung ke server. Coba lagi.' })
              }
            }}
            onCancel={() => setIsSplitMode(false)}
          />
        </>
      )}
    </div>
  )
}
