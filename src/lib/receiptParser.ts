import { getTodayInputDate } from '@/lib/formatters'
import type { TransactionDraft } from '@/lib/transactionDrafts'

export interface ReceiptParseResult {
  merchantName: string
  total: number
  items: Array<{
    name: string
    amount: number
  }>
  rawText: string
}

export function parseAmount(value: string): number {
  const digits = value.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

export function parseReceiptText(text: string): ReceiptParseResult {
  const lines = normalizeReceiptLines(text)
  const total = extractReceiptTotal(lines)
  const items = extractReceiptItems(lines)
  const merchantName = lines.find(line => !/\d/.test(line) && !/total|jumlah|grand|subtotal/i.test(line)) ?? ''

  return {
    merchantName,
    total,
    items,
    rawText: text,
  }
}

export function createReceiptDraft(parsed: ReceiptParseResult): TransactionDraft {
  return {
    source: 'receipt',
    sourceLabel: 'Draft OCR struk',
    nominal: parsed.total,
    kategori: 'Belanja',
    tanggal: getTodayInputDate(),
    catatan: compactReceiptNote(parsed),
  }
}

function normalizeReceiptLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function extractReceiptTotal(lines: string[]): number {
  const totalLine = [...lines].reverse().find(line => /total|jumlah|grand/i.test(line))
  if (totalLine) {
    const totalAmounts = totalLine.match(/\d[\d.,]*/g)?.map(parseAmount).filter(Boolean) ?? []
    if (totalAmounts.length > 0) return Math.max(...totalAmounts)
  }

  const itemAmounts = extractReceiptItems(lines).map(item => item.amount)
  return itemAmounts.reduce((sum, amount) => sum + amount, 0)
}

function extractReceiptItems(lines: string[]): ReceiptParseResult['items'] {
  return lines.flatMap(line => {
    if (/total|jumlah|grand|subtotal|kembalian|tunai|debit|qris/i.test(line)) {
      return []
    }

    const amounts = line.match(/\d[\d.,]*/g)?.map(parseAmount).filter(Boolean) ?? []
    const amount = amounts[amounts.length - 1] ?? 0
    if (amount <= 0) return []

    const name = line
      .replace(/\d[\d.,]*\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (!name || name.length < 2) return []

    return [{ name, amount }]
  })
}

function compactReceiptNote(parsed: ReceiptParseResult): string {
  const itemPreview = parsed.items
    .slice(0, 3)
    .map(item => `${item.name} ${item.amount}`)
    .join('; ')

  const prefix = parsed.merchantName ? `Draft OCR ${parsed.merchantName}: ` : 'Draft OCR: '
  const content = itemPreview || normalizeReceiptLines(parsed.rawText).slice(0, 4).join('; ')

  return `${prefix}${content}`.slice(0, 200)
}
