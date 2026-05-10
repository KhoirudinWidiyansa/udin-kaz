export default function OfflinePage() {
  return (
    <main className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '1rem' }}>
          Offline
        </p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
          Tidak ada koneksi
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Periksa koneksi internet kamu dan coba lagi.
        </p>
      </div>
    </main>
  )
}
