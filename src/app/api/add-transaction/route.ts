import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { insertTransaction, insertTransactions } from '@/lib/db'
import { validateSplitTotal } from '@/lib/splitTransaction'
import { transactionSchema } from '@/lib/validators'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { isSplit, splits, ...transactionData } = body

    // Validate input with Zod
    const result = transactionSchema.safeParse(transactionData)
    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    if (isSplit && Array.isArray(splits) && splits.length > 0) {
      for (const split of splits) {
        if (!split?.kategori || !split?.nominal || Number(split.nominal) <= 0) {
          return NextResponse.json(
            { error: 'Setiap data split wajib memiliki kategori dan nominal yang valid.' },
            { status: 400 }
          )
        }
      }

      const splitValidation = validateSplitTotal(splits, result.data.nominal)
      if (!splitValidation.isValid) {
        return NextResponse.json(
          { error: 'Total nominal split harus sama dengan nominal transaksi utama.' },
          { status: 400 }
        )
      }

      const splitTransactions = splits.map((split: { kategori: string; nominal: number; catatan?: string }) => ({
        jenis: result.data.jenis,
        nominal: Number(split.nominal),
        kategori: split.kategori,
        nama: result.data.nama,
        tanggal: result.data.tanggal,
        catatan: [result.data.catatan, split.catatan?.trim()].filter(Boolean).join(' | '),
      }))

      const transactions = await insertTransactions(splitTransactions)

      revalidatePath('/')

      return NextResponse.json(
        { success: true, transactions },
        { status: 200 }
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
