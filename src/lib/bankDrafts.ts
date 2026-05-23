import { getTodayInputDate } from '@/lib/formatters'
import type { TransactionDraft } from '@/lib/transactionDrafts'

export interface BankDraftSourceTransaction {
  id?: string
  description: string
  amount: number
  date?: string
  category?: string
}

export function createDemoBankDrafts(): TransactionDraft[] {
  const today = getTodayInputDate()

  return [
    createBankDraft({
      id: 'demo-bca-001',
      description: 'COFFEE SHOP SENJA',
      amount: 32000,
      date: today,
      category: 'Makan',
    }),
    createBankDraft({
      id: 'demo-bca-002',
      description: 'PLN PREPAID',
      amount: 175000,
      date: today,
      category: 'Tagihan',
    }),
  ]
}

export function createBankDraft(transaction: BankDraftSourceTransaction): TransactionDraft {
  return {
    source: 'bank',
    sourceLabel: 'Draft mutasi bank',
    nominal: transaction.amount,
    kategori: transaction.category || inferCategoryFromDescription(transaction.description),
    tanggal: transaction.date || getTodayInputDate(),
    catatan: `Draft dari mutasi bank: ${transaction.description}`,
  }
}

export function inferCategoryFromDescription(description: string): string {
  const normalized = description.toLowerCase()

  if (/(coffee|kopi|resto|restaurant|cafe|food|makan|warung|bakery)/i.test(normalized)) {
    return 'Makan'
  }

  if (/(grab|gojek|maxim|taxi|parking|parkir|tol|shell|pertamina|bensin)/i.test(normalized)) {
    return 'Transportasi'
  }

  if (/(pln|pdam|internet|telkom|token|prepaid|tagihan|bill)/i.test(normalized)) {
    return 'Tagihan'
  }

  if (/(market|mart|store|shop|belanja|tokopedia|shopee|lazada)/i.test(normalized)) {
    return 'Belanja'
  }

  return 'Lainnya'
}
