import { NextRequest, NextResponse } from 'next/server'
import { createBankDraft, createDemoBankDrafts, type BankDraftSourceTransaction } from '@/lib/bankDrafts'

export async function GET() {
  try {
    const endpoint = process.env.BANK_DRAFTS_ENDPOINT

    if (endpoint) {
      const response = await fetch(endpoint, {
        headers: process.env.BANK_DRAFTS_TOKEN
          ? { Authorization: `Bearer ${process.env.BANK_DRAFTS_TOKEN}` }
          : undefined,
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Bank drafts endpoint failed with ${response.status}`)
      }

      const payload = await response.json()
      const transactions = normalizeBankTransactions(payload)

      return NextResponse.json({
        success: true,
        provider: 'external-endpoint',
        drafts: transactions.map(createBankDraft),
      })
    }

    return NextResponse.json({
      success: true,
      provider: 'demo-sandbox',
      drafts: createDemoBankDrafts(),
    })
  } catch (error) {
    console.error('[GET /api/bank/drafts] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil draft mutasi bank.', code: 'BANK_DRAFTS_FAILED' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const transactions = normalizeBankTransactions(body)

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada transaksi bank yang bisa diproses.', code: 'EMPTY_BANK_TRANSACTIONS' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      provider: 'manual-import',
      drafts: transactions.map(createBankDraft),
    })
  } catch (error) {
    console.error('[POST /api/bank/drafts] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengubah mutasi menjadi draft.', code: 'BANK_IMPORT_FAILED' },
      { status: 500 }
    )
  }
}

function normalizeBankTransactions(payload: any): BankDraftSourceTransaction[] {
  const rawTransactions = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.transactions)
      ? payload.transactions
      : Array.isArray(payload?.data)
        ? payload.data
        : []

  return rawTransactions.flatMap((item: any) => {
    const amount = Number(item.amount ?? item.nominal ?? item.value ?? 0)
    const description = String(item.description ?? item.remark ?? item.name ?? item.nama ?? '').trim()
    const direction = String(item.direction ?? item.type ?? item.jenis ?? 'debit').toLowerCase()

    if (!description || amount <= 0 || direction.includes('credit') || direction.includes('pemasukan')) {
      return []
    }

    return [{
      id: item.id ? String(item.id) : undefined,
      description,
      amount,
      date: item.date ?? item.tanggal ?? item.transactionDate,
      category: item.category ?? item.kategori,
    }]
  })
}
