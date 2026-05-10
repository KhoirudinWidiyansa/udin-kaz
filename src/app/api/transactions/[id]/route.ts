import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { deleteTransaction } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    const success = await deleteTransaction(id)
    if (!success) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan' }, { status: 404 })
    }

    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`[DELETE /api/transactions/${params.id}] Error:`, error)
    return NextResponse.json(
      { error: 'Gagal menghapus transaksi.' },
      { status: 500 }
    )
  }
}
