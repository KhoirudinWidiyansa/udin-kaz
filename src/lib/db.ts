import { sql } from '@vercel/postgres'

export interface Transaction {
  id: number
  created_at: string
  tanggal: string
  jenis: 'pengeluaran'
  nominal: number
  kategori: string
  nama: string
  catatan: string
}

export interface CategorySummary {
  kategori: string
  total: number
  count: number
}

export interface GetTransactionsParams {
  page?: number
  bulan?: string
  nama?: string
  kategori?: string
  minNominal?: number
  maxNominal?: number
  sortDate?: 'desc' | 'asc'
  sortNominal?: 'desc' | 'asc'
}

const PAGE_SIZE = 8

/**
 * Fetch transactions with server-side filtering, sorting, and pagination
 */
export async function getTransactions(params: GetTransactionsParams): Promise<{ totalPengeluaran: number; transaksi: Transaction[]; totalCount: number; hasMore: boolean; categorySummary: CategorySummary[] }> {
  const page = params.page || 1
  const offset = (page - 1) * PAGE_SIZE
  const bulan = params.bulan || ''
  const nama = params.nama || ''
  const kategori = params.kategori || ''
  const minNominal = params.minNominal ?? 0
  const maxNominal = params.maxNominal ?? 999999999999

  // Get total pengeluaran + count (filtered)
  const saldoResult = await sql`
    SELECT
      COALESCE(SUM(nominal), 0) AS total_keluar,
      COUNT(*)::int AS total_count
    FROM transaksi
    WHERE jenis = 'pengeluaran'
      AND (CAST(${bulan} AS TEXT) = '' OR to_char(tanggal, 'YYYY-MM') = ${bulan})
      AND (CAST(${nama} AS TEXT) = '' OR nama ILIKE '%' || ${nama} || '%')
      AND (CAST(${kategori} AS TEXT) = '' OR kategori = ${kategori})
      AND (nominal >= ${minNominal} AND nominal <= ${maxNominal})
  `
  
  const totalPengeluaran = Number(saldoResult.rows[0].total_keluar)
  const totalCount = Number(saldoResult.rows[0].total_count)

  // Get category summary (filtered)
  const categoryResult = await sql`
    SELECT kategori, SUM(nominal) as total, COUNT(*)::int as count
    FROM transaksi
    WHERE jenis = 'pengeluaran'
      AND (CAST(${bulan} AS TEXT) = '' OR to_char(tanggal, 'YYYY-MM') = ${bulan})
      AND (CAST(${nama} AS TEXT) = '' OR nama ILIKE '%' || ${nama} || '%')
      AND (CAST(${kategori} AS TEXT) = '' OR kategori = ${kategori})
      AND (nominal >= ${minNominal} AND nominal <= ${maxNominal})
    GROUP BY kategori
    ORDER BY total DESC
  `
  const categorySummary = categoryResult.rows.map(r => ({
    kategori: r.kategori,
    total: Number(r.total),
    count: Number(r.count),
  }))

  // Determine sort order
  let orderBy = 'tanggal DESC, created_at DESC'
  if (params.sortNominal === 'desc') {
    orderBy = 'nominal DESC, tanggal DESC'
  } else if (params.sortNominal === 'asc') {
    orderBy = 'nominal ASC, tanggal DESC'
  } else if (params.sortDate === 'asc') {
    orderBy = 'tanggal ASC, created_at ASC'
  }

  // Get paginated transactions (filtered and sorted)
  const txResult = await sql.query(`
    SELECT id, created_at, tanggal, jenis, nominal, kategori, nama, catatan
    FROM transaksi
    WHERE jenis = 'pengeluaran'
      AND (CAST($1 AS TEXT) = '' OR to_char(tanggal, 'YYYY-MM') = $1)
      AND (CAST($2 AS TEXT) = '' OR nama ILIKE '%' || $2 || '%')
      AND (CAST($3 AS TEXT) = '' OR kategori = $3)
      AND (nominal >= $4 AND nominal <= $5)
    ORDER BY ${orderBy}
    LIMIT $6
    OFFSET $7
  `, [bulan, nama, kategori, minNominal, maxNominal, PAGE_SIZE, offset])

  const transaksi: Transaction[] = txResult.rows.map((r) => ({
    id: r.id,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    tanggal: r.tanggal instanceof Date ? r.tanggal.toISOString().split('T')[0] : String(r.tanggal),
    jenis: r.jenis,
    nominal: Number(r.nominal),
    kategori: r.kategori,
    nama: r.nama,
    catatan: r.catatan ?? '',
  }))

  return { totalPengeluaran, transaksi, totalCount, hasMore: offset + PAGE_SIZE < totalCount, categorySummary }
}

/**
 * Fetch all pengeluaran transactions for export (no LIMIT)
 */
export async function getAllTransactionsForExport(bulan?: string): Promise<Transaction[]> {
  let txResult
  if (bulan) {
    txResult = await sql`
      SELECT id, created_at, tanggal, jenis, nominal, kategori, nama, catatan
      FROM transaksi
      WHERE jenis = 'pengeluaran' AND to_char(tanggal, 'YYYY-MM') = ${bulan}
      ORDER BY tanggal DESC, created_at DESC
    `
  } else {
    txResult = await sql`
      SELECT id, created_at, tanggal, jenis, nominal, kategori, nama, catatan
      FROM transaksi
      WHERE jenis = 'pengeluaran'
      ORDER BY tanggal DESC, created_at DESC
    `
  }

  return txResult.rows.map((r) => ({
    id: r.id,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    tanggal: r.tanggal instanceof Date ? r.tanggal.toISOString().split('T')[0] : String(r.tanggal),
    jenis: r.jenis,
    nominal: Number(r.nominal),
    kategori: r.kategori,
    nama: r.nama,
    catatan: r.catatan ?? '',
  }))
}

/**
 * Insert a new transaction row
 */
export async function insertTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const result = await sql`
    INSERT INTO transaksi (tanggal, jenis, nominal, kategori, nama, catatan)
    VALUES (${data.tanggal}, ${data.jenis}, ${data.nominal}, ${data.kategori}, ${data.nama}, ${data.catatan})
    RETURNING id, created_at, tanggal, jenis, nominal, kategori, nama, catatan
  `
  const row = result.rows[0]
  return {
    id: row.id,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    tanggal: row.tanggal instanceof Date ? row.tanggal.toISOString().split('T')[0] : String(row.tanggal),
    jenis: row.jenis,
    nominal: Number(row.nominal),
    kategori: row.kategori,
    nama: row.nama,
    catatan: row.catatan ?? '',
  }
}

/**
 * Insert multiple transaction rows while preserving the input order.
 */
export async function insertTransactions(
  items: Array<Omit<Transaction, 'id' | 'created_at'>>
): Promise<Transaction[]> {
  const transactions: Transaction[] = []

  for (const item of items) {
    transactions.push(await insertTransaction(item))
  }

  return transactions
}

/**
 * Delete a transaction by ID
 */
export async function deleteTransaction(id: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM transaksi
    WHERE id = ${id}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Fetch list of anggota names
 */
export async function getAnggota(): Promise<string[]> {
  const result = await sql`SELECT nama FROM anggota`
  return result.rows.map(r => r.nama)
}

/**
 * Fetch details of an anggota by name
 */
export async function getAnggotaByName(nama: string): Promise<{ nama: string; pin_hash: string | null } | null> {
  const result = await sql`SELECT nama, pin_hash FROM anggota WHERE nama = ${nama}`;
  if (result.rows.length === 0) return null;
  return {
    nama: result.rows[0].nama,
    pin_hash: result.rows[0].pin_hash,
  };
}

/**
 * Insert new anggota
 */
export async function insertAnggota(nama: string): Promise<string> {
  await sql`
    INSERT INTO anggota (nama) VALUES (${nama})
    ON CONFLICT (nama) DO NOTHING
  `
  return nama
}

/**
 * Fetch list of unique months (YYYY-MM) from transactions
 */
export async function getAvailableMonths(): Promise<string[]> {
  const result = await sql`
    SELECT DISTINCT to_char(tanggal, 'YYYY-MM') as month
    FROM transaksi
    WHERE jenis = 'pengeluaran'
    ORDER BY month DESC
  `
  return result.rows.map(r => r.month)
}
