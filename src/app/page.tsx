import { getTransactions, getAnggota, getAvailableMonths } from '@/lib/db'
import Dashboard from '@/components/Dashboard'

// ISR: revalidate every 30 seconds
export const revalidate = 30

export default async function HomePage() {
  let initialData = { totalPengeluaran: 0, transaksi: [] as any[], totalCount: 0, hasMore: false, categorySummary: [] as any[] }
  let initialAnggota: string[] = []
  let initialMonths: string[] = []
  let fetchError = false

  const currentMonth = new Date().toISOString().substring(0, 7)
  try {
    const [txData, anggotaData, monthsData] = await Promise.all([
      getTransactions({ bulan: currentMonth }),
      getAnggota(),
      getAvailableMonths()
    ])
    initialData = txData
    initialAnggota = anggotaData
    initialMonths = monthsData
  } catch (error) {
    // On error (e.g. missing env vars in dev), show empty state
    fetchError = true
    console.error('Failed to fetch data on page load:', error)
  }

  return (
    <main className="app-shell">
      <Dashboard initialData={initialData} initialAnggota={initialAnggota} initialMonths={initialMonths} fetchError={fetchError} />
    </main>
  )
}
