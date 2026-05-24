import { NextRequest, NextResponse } from 'next/server'
import { createTransactionSplits, getTransactionSplits, deleteTransactionSplits, validateSplitTotal } from '@/lib/splitTransaction'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transaksiId = searchParams.get('transaksi_id')

    if (!transaksiId) {
      return NextResponse.json(
        { error: 'transaksi_id wajib diisi.' },
        { status: 400 }
      )
    }

    const splits = await getTransactionSplits(Number(transaksiId))
    return NextResponse.json({ success: true, splits })
  } catch (error) {
    console.error('[GET /api/transactions/split] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data split.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transaksi_id, splits } = body

    if (!transaksi_id || !Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json(
        { error: 'transaksi_id dan splits wajib diisi.' },
        { status: 400 }
      )
    }

    // Validate each split has required fields
    for (const split of splits) {
      if (!split.kategori || !split.nominal || split.nominal <= 0) {
        return NextResponse.json(
          { error: 'Setiap split wajib memiliki kategori dan nominal yang valid.' },
          { status: 400 }
        )
      }
    }

    const createdSplits = await createTransactionSplits(Number(transaksi_id), splits)
    return NextResponse.json({ success: true, splits: createdSplits })
  } catch (error) {
    console.error('[POST /api/transactions/split] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan split transaksi.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transaksiId = searchParams.get('transaksi_id')

    if (!transaksiId) {
      return NextResponse.json(
        { error: 'transaksi_id wajib diisi.' },
        { status: 400 }
      )
    }

    const deleted = await deleteTransactionSplits(Number(transaksiId))
    return NextResponse.json({ success: deleted })
  } catch (error) {
    console.error('[DELETE /api/transactions/split] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus split transaksi.' },
      { status: 500 }
    )
  }
}