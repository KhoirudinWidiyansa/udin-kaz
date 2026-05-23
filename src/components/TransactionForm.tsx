'use client'

import { useState, useEffect, useRef } from 'react'
import { KATEGORI_LIST, NAMA_ANGGOTA_DEFAULT } from '@/lib/validators'
import type { TransactionDraft } from '@/lib/transactionDrafts'

const STORAGE_KEY_NAMA = 'kas_keluarga_nama'
const STORAGE_KEY_NAMA_LIST = 'kas_keluarga_nama_list'

// Default family members — can be customized via UI
const DEFAULT_ANGGOTA = [...NAMA_ANGGOTA_DEFAULT]

interface TransactionFormProps {
  onSuccess: () => void
  onClose: () => void
  initialAnggota: string[]
  initialDraft?: TransactionDraft | null
}

export default function TransactionForm({ onSuccess, onClose, initialAnggota, initialDraft }: TransactionFormProps) {
  console.log('🔴 TransactionForm RENDERED', { initialAnggota })
  
  // jenis is always 'pengeluaran' — income feature removed
  const [nominal, setNominal] = useState(() => initialDraft?.nominal ? String(initialDraft.nominal) : '')
  const [kategori, setKategori] = useState(() => initialDraft?.kategori ?? '')
  const [nama, setNama] = useState(() => initialDraft?.nama ?? '')
  const [tanggal, setTanggal] = useState(() => initialDraft?.tanggal ?? new Date().toISOString().split('T')[0])
  const [catatan, setCatatan] = useState(() => initialDraft?.catatan ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [anggotaList, setAnggotaList] = useState<string[]>(initialAnggota)

  // Debug: log initial value
  useEffect(() => {
    console.log('[anggota] initialAnggota prop:', initialAnggota)
  }, [])

  // Custom anggota additions
  const [isAddingAnggota, setIsAddingAnggota] = useState(false)
  const [newAnggotaName, setNewAnggotaName] = useState('')

  const nominalRef = useRef<HTMLInputElement>(null)

  // Fetch latest anggota list from API on mount
  useEffect(() => {
    fetch('/api/anggota', { cache: 'no-store', headers: { 'Accept': 'application/json' } })
      .then(res => {
        console.log('[anggota] status:', res.status, 'content-type:', res.headers.get('content-type'))
        return res.ok ? res.json() : null
      })
      .then(data => {
        console.log('[anggota] data:', data)
        if (Array.isArray(data) && data.length > 0) {
          setAnggotaList(data)
        }
      })
      .catch(err => console.error('[anggota] error:', err))
  }, [])

  // Load last used name from localStorage (focus only name preference)
  useEffect(() => {
    const savedNama = localStorage.getItem(STORAGE_KEY_NAMA)
    if (!initialDraft?.nama && savedNama) {
      setNama(savedNama)
    }

    // Focus nominal input on open
    setTimeout(() => nominalRef.current?.focus(), 100)
  }, [initialDraft?.nama])

  // Format number to Rupiah display
  const formatDisplayNominal = (raw: string): string => {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    return new Intl.NumberFormat('id-ID').format(parseInt(digits))
  }

  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '')
    setNominal(raw)
    if (errors.nominal) setErrors(prev => ({ ...prev, nominal: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Client-side validation
    const newErrors: Record<string, string> = {}
    if (!nominal || parseInt(nominal) <= 0) newErrors.nominal = 'Nominal wajib diisi'
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
          nominal: parseInt(nominal),
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

      // Save name to localStorage for next time
      localStorage.setItem(STORAGE_KEY_NAMA, nama.trim())

      // Add to custom list if new
      if (!anggotaList.includes(nama.trim())) {
        setAnggotaList([...anggotaList, nama.trim()])
      }

      onSuccess()
    } catch {
      setErrors({ _form: 'Gagal terhubung ke server. Coba lagi.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="sheet-modal" role="dialog" aria-modal="true" aria-label="Form Tambah Transaksi">
      <div className="sheet-handle" onClick={onClose} style={{ cursor: 'pointer' }} />
      <h2 className="sheet-title">{initialDraft ? 'Review Draft Transaksi' : 'Catat Transaksi'}</h2>

      {initialDraft && (
        <div className="draft-source-banner">
          <span>{initialDraft.sourceLabel}</span>
          <strong>Editable sebelum simpan</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Jenis is always pengeluaran */}

        {/* Nominal */}
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

        {/* Kategori */}
        <div className="form-group">
          <label className="form-label" htmlFor="select-kategori">Kategori</label>
          <select
            id="select-kategori"
            className="form-select"
            value={kategori}
            onChange={e => { setKategori(e.target.value); setErrors(p => ({ ...p, kategori: '' })) }}
          >
            <option value="">Pilih kategori...</option>
            {KATEGORI_LIST.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          {errors.kategori && <p className="form-error">{errors.kategori}</p>}
        </div>

        {/* Nama Anggota */}
        <div className="form-group">
          <label className="form-label" htmlFor="select-nama">Nama Anggota</label>
          {isAddingAnggota ? (
            <div style={{ display: 'flex', gap: '8px' }}>
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
                className="btn-submit"
                style={{ width: 'auto', marginTop: 0, padding: '0 16px' }}
                onClick={async () => {
                  const cleanedName = newAnggotaName.trim()
                  if (cleanedName) {
                    if (!anggotaList.includes(cleanedName)) {
                      // Save to DB
                      try {
                        const res = await fetch('/api/anggota', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ nama: cleanedName })
                        })
                        if (res.ok) {
                          setAnggotaList([...anggotaList, cleanedName])
                        }
                      } catch (err) {
                        console.error('Failed to save string')
                      }
                    }
                    setNama(cleanedName)
                    setErrors(p => ({ ...p, nama: '' }))
                  } else if (nama) {
                     // revert to previously selected if empty Name
                  } else {
                     setNama('')
                  }
                  setIsAddingAnggota(false)
                  setNewAnggotaName('')
                }}
              >
                OK
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
                  setErrors(p => ({ ...p, nama: '' }))
                }
              }}
            >
              <option value="">Pilih nama...</option>
              {anggotaList.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value="__add__" style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>+ Tambah Anggota Baru...</option>
            </select>
          )}
          {errors.nama && <p className="form-error">{errors.nama}</p>}
        </div>

        {/* Tanggal */}
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

        {/* Catatan */}
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

        {/* Form-level error */}
        {errors._form && <p className="form-error" style={{ marginBottom: '8px' }}>{errors._form}</p>}

        <button
          type="submit"
          id="btn-submit-transaksi"
          className="btn-submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Menyimpan...' : initialDraft ? 'Simpan Draft' : 'Catat Sekarang'}
        </button>
      </form>
    </div>
  )
}
