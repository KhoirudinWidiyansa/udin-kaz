import { NextRequest, NextResponse } from 'next/server'
import { getBudgets, setBudget, deleteBudget, calculateBudgetProgress } from '@/lib/budget'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bulan = searchParams.get('bulan') || new Date().toISOString().substring(0, 7)
    const includeProgress = searchParams.get('progress') === 'true'

    if (includeProgress) {
      const progress = await calculateBudgetProgress(bulan)
      return NextResponse.json({ success: true, progress })
    }

    const budgets = await getBudgets(bulan)
    return NextResponse.json({ success: true, budgets })
  } catch (error) {
    console.error('[GET /api/budget] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data budget.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { kategori, limit, bulan } = body

    if (!kategori || !limit || !bulan) {
      return NextResponse.json(
        { error: 'Kategori, limit, dan bulan wajib diisi.' },
        { status: 400 }
      )
    }

    const budget = await setBudget(kategori, Number(limit), bulan)
    return NextResponse.json({ success: true, budget })
  } catch (error) {
    console.error('[POST /api/budget] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan budget.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const kategori = searchParams.get('kategori')
    const bulan = searchParams.get('bulan')

    if (!kategori || !bulan) {
      return NextResponse.json(
        { error: 'Kategori dan bulan wajib diisi.' },
        { status: 400 }
      )
    }

    const deleted = await deleteBudget(kategori, bulan)
    return NextResponse.json({ success: deleted })
  } catch (error) {
    console.error('[DELETE /api/budget] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menghapus budget.' },
      { status: 500 }
    )
  }
}
