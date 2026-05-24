'use client'

import { useState, useEffect } from 'react'
import { 
  getNotificationPreferences, 
  saveNotificationPreferences, 
  requestNotificationPermission 
} from '@/lib/notifications'

interface NotificationSettingsProps {
  onClose: () => void
}

export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const [prefs, setPrefs] = useState({
    enabled: false,
    budgetWarnings: true,
    dailyReminder: true,
    overspendingAlert: true,
  })
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const saved = getNotificationPreferences()
    setPrefs(saved)
    
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission()
    setPermissionStatus(granted ? 'granted' : 'denied')
    
    if (granted) {
      setPrefs(prev => ({ ...prev, enabled: true }))
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      saveNotificationPreferences(prefs)
      onClose()
    } catch (err) {
      console.error('Failed to save notification settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="notification-settings">
      <div className="sheet-handle" onClick={onClose} style={{ cursor: 'pointer' }} />
      <h2 className="sheet-title">Pengaturan Notifikasi</h2>

      {/* Permission Status */}
      <div style={{
        padding: '12px',
        background: permissionStatus === 'granted' 
          ? 'var(--color-success)15' 
          : permissionStatus === 'denied'
            ? 'var(--color-error)15'
            : 'var(--color-accent)15',
        borderRadius: 'var(--radius-md)',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 500, display: 'block' }}>
              Status Notifikasi
            </span>
            <span style={{ 
              fontSize: '0.8rem', 
              color: 'var(--color-text-dim)' 
            }}>
              {permissionStatus === 'granted' 
                ? 'Notifikasi diaktifkan' 
                : permissionStatus === 'denied'
                  ? 'Notifikasi diblokir'
                  : 'Belum diizinkan'}
            </span>
          </div>
          {permissionStatus !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#0a0600',
                fontSize: '0.8rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Aktifkan
            </button>
          )}
        </div>
      </div>

      {/* Toggle Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ToggleOption
          title="Aktifkan Notifikasi"
          description="Nyalakan semua notifikasi"
          checked={prefs.enabled}
          onChange={() => handleToggle('enabled')}
          disabled={permissionStatus !== 'granted'}
        />

        <ToggleOption
          title="Peringatan Budget"
          description="Notifikasi saat budget mencapai 80%, 90%, 100%"
          checked={prefs.budgetWarnings}
          onChange={() => handleToggle('budgetWarnings')}
          disabled={!prefs.enabled}
        />

        <ToggleOption
          title="Pengingat Harian"
          description="Ingatkan untuk mencatat transaksi jika belum ada (pukul 20:00)"
          checked={prefs.dailyReminder}
          onChange={() => handleToggle('dailyReminder')}
          disabled={!prefs.enabled}
        />

        <ToggleOption
          title="Alert Pengeluaran Tinggi"
          description="Notifikasi jika pengeluaran hari ini 50% di atas rata-rata"
          checked={prefs.overspendingAlert}
          onChange={() => handleToggle('overspendingAlert')}
          disabled={!prefs.enabled}
        />
      </div>

      {/* Info */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.75rem',
        color: 'var(--color-text-dim)',
      }}>
        <p style={{ margin: 0 }}>
          💡 Notifikasi akan muncul di browser kamu. Pastikan browser mendukung push notifications.
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
        <button
          onClick={onClose}
          className="btn-submit"
          style={{ 
            background: 'transparent', 
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)'
          }}
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-submit"
        >
          {isSaving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  )
}

function ToggleOption({ 
  title, 
  description, 
  checked, 
  onChange, 
  disabled 
}: { 
  title: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div
      onClick={disabled ? undefined : onChange}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div>
        <span style={{ fontWeight: 500, display: 'block' }}>{title}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
          {description}
        </span>
      </div>
      <div
        style={{
          width: '48px',
          height: '24px',
          borderRadius: '12px',
          background: checked ? 'var(--color-accent)' : 'var(--color-bg)',
          position: 'relative',
          transition: 'background 0.2s ease',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '10px',
            background: '#fff',
            position: 'absolute',
            top: '2px',
            left: checked ? '26px' : '2px',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </div>
  )
}