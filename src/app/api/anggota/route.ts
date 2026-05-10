import { NextRequest, NextResponse } from 'next/server'
import { getAnggota, insertAnggota } from '@/lib/db'

export async function GET() {
  try {
    const data = await getAnggota()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[GET /api/anggota] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data anggota.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nama } = await request.json()
    if (!nama || typeof nama !== 'string') {
      return NextResponse.json({ error: 'Nama tidak valid' }, { status: 400 })
    }

    await insertAnggota(nama.trim())
    return NextResponse.json({ success: true, nama: nama.trim() })
  } catch (error) {
    console.error('[POST /api/anggota] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan anggota baru.' },
      { status: 500 }
    )
  }
}
