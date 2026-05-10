import { NextRequest, NextResponse } from 'next/server'
import { getTransactions } from '@/lib/db'

export const revalidate = 30

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const bulan = searchParams.get('bulan') || undefined
    const nama = searchParams.get('nama') || undefined
    const kategori = searchParams.get('kategori') || undefined
    const sortDate = (searchParams.get('sortDate') as 'desc' | 'asc') || undefined

    const data = await getTransactions({ page, bulan, nama, kategori, sortDate })
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[GET /api/transactions] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data transaksi. Coba lagi nanti.' },
      { status: 500 }
    )
  }
}
