import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { insertTransaction } from '@/lib/db'
import { transactionSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const result = transactionSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const transaction = await insertTransaction(result.data)

    // Invalidate ISR cache so dashboard gets fresh data
    revalidatePath('/')

    return NextResponse.json(
      { success: true, transaction },
      { status: 200 }
    )
  } catch (error) {
    console.error('[POST /api/add-transaction] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menyimpan transaksi. Coba lagi nanti.' },
      { status: 500 }
    )
  }
}
