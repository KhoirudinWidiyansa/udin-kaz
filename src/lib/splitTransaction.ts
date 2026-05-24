import { sql } from '@vercel/postgres'

export interface TransaksiSplit {
  id: number
  transaksi_id: number
  kategori: string
  nominal: number
  catatan: string
  created_at: string
}

export interface SplitInput {
  kategori: string
  nominal: number
  catatan?: string
}

/**
 * Create splits for a transaction
 */
export async function createTransactionSplits(
  transaksiId: number,
  splits: SplitInput[]
): Promise<TransaksiSplit[]> {
  if (splits.length === 0) return []

  const results = await Promise.all(
    splits.map(split => sql`
      INSERT INTO transaksi_split (transaksi_id, kategori, nominal, catatan)
      VALUES (${transaksiId}, ${split.kategori}, ${split.nominal}, ${split.catatan || ''})
      RETURNING id, transaksi_id, kategori, nominal, catatan, created_at
    `)
  )

  return results.flatMap(result => result.rows.map(row => ({
    id: row.id,
    transaksi_id: row.transaksi_id,
    kategori: row.kategori,
    nominal: Number(row.nominal),
    catatan: row.catatan || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  })))
}

/**
 * Get splits for a transaction
 */
export async function getTransactionSplits(transaksiId: number): Promise<TransaksiSplit[]> {
  const result = await sql`
    SELECT id, transaksi_id, kategori, nominal, catatan, created_at
    FROM transaksi_split
    WHERE transaksi_id = ${transaksiId}
    ORDER BY id
  `
  
  return result.rows.map(row => ({
    id: row.id,
    transaksi_id: row.transaksi_id,
    kategori: row.kategori,
    nominal: Number(row.nominal),
    catatan: row.catatan || '',
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }))
}

/**
 * Delete all splits for a transaction
 */
export async function deleteTransactionSplits(transaksiId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM transaksi_split
    WHERE transaksi_id = ${transaksiId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Update splits for a transaction (delete old, create new)
 */
export async function updateTransactionSplits(
  transaksiId: number,
  splits: SplitInput[]
): Promise<TransaksiSplit[]> {
  await deleteTransactionSplits(transaksiId)
  return createTransactionSplits(transaksiId, splits)
}

/**
 * Validate split amounts match total
 */
export function validateSplitTotal(splits: SplitInput[], totalNominal: number): {
  isValid: boolean
  difference: number
  message: string
} {
  const splitTotal = splits.reduce((sum, split) => sum + split.nominal, 0)
  const difference = totalNominal - splitTotal
  
  return {
    isValid: difference === 0,
    difference,
    message: difference === 0 
      ? 'Split amounts match total'
      : difference > 0 
        ? `Remaining: Rp ${difference.toLocaleString('id-ID')}`
        : `Excess: Rp ${Math.abs(difference).toLocaleString('id-ID')}`,
  }
}
