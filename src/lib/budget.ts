import { sql } from '@vercel/postgres'

export interface BudgetKategori {
  id: number
  kategori: string
  limit: number
  bulan: string
  created_at: string
}

export interface BudgetProgress {
  kategori: string
  limit: number
  spent: number
  percentage: number
  status: 'safe' | 'warning' | 'exceeded'
}

/**
 * Get all budgets for a specific month
 */
export async function getBudgets(bulan: string): Promise<BudgetKategori[]> {
  const result = await sql`
    SELECT id, kategori, limit, bulan, created_at
    FROM budget_kategori
    WHERE bulan = ${bulan}
    ORDER BY kategori
  `
  
  return result.rows.map(row => ({
    id: row.id,
    kategori: row.kategori,
    limit: Number(row.limit),
    bulan: row.bulan,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }))
}

/**
 * Set budget limit for a category in a specific month
 */
export async function setBudget(kategori: string, limit: number, bulan: string): Promise<BudgetKategori> {
  const result = await sql`
    INSERT INTO budget_kategori (kategori, limit, bulan)
    VALUES (${kategori}, ${limit}, ${bulan})
    ON CONFLICT (kategori, bulan) 
    DO UPDATE SET limit = ${limit}
    RETURNING id, kategori, limit, bulan, created_at
  `
  
  const row = result.rows[0]
  return {
    id: row.id,
    kategori: row.kategori,
    limit: Number(row.limit),
    bulan: row.bulan,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  }
}

/**
 * Delete budget for a category in a specific month
 */
export async function deleteBudget(kategori: string, bulan: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM budget_kategori
    WHERE kategori = ${kategori} AND bulan = ${bulan}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Calculate budget progress for all categories in a month
 */
export async function calculateBudgetProgress(bulan: string): Promise<BudgetProgress[]> {
  // Get all budgets for the month
  const budgets = await getBudgets(bulan)
  
  if (budgets.length === 0) return []
  
  // Get spending from transaksi table
  const spendingResult = await sql`
    SELECT kategori, SUM(nominal) as total
    FROM transaksi
    WHERE jenis = 'pengeluaran' AND to_char(tanggal, 'YYYY-MM') = ${bulan}
    GROUP BY kategori
  `
  
  // Get spending from transaksi_split table
  const splitResult = await sql`
    SELECT kategori, SUM(nominal) as total
    FROM transaksi_split
    WHERE to_char(created_at, 'YYYY-MM') = ${bulan}
    GROUP BY kategori
  `
  
  // Aggregate spending
  const spending: Record<string, number> = {}
  
  spendingResult.rows.forEach(row => {
    spending[row.kategori] = (spending[row.kategori] || 0) + Number(row.total)
  })
  
  splitResult.rows.forEach(row => {
    spending[row.kategori] = (spending[row.kategori] || 0) + Number(row.total)
  })
  
  // Calculate progress for each budget
  return budgets.map(budget => {
    const spent = spending[budget.kategori] || 0
    const percentage = budget.limit > 0 ? (spent / budget.limit) * 100 : 0
    
    let status: 'safe' | 'warning' | 'exceeded'
    if (percentage >= 100) {
      status = 'exceeded'
    } else if (percentage >= 80) {
      status = 'warning'
    } else {
      status = 'safe'
    }
    
    return {
      kategori: budget.kategori,
      limit: budget.limit,
      spent,
      percentage: Math.round(percentage * 10) / 10,
      status,
    }
  })
}

/**
 * Calculate end-of-month spending prediction
 */
export async function calculateMonthlyPrediction(bulan: string): Promise<{
  dailyAverage: number
  daysPassed: number
  daysInMonth: number
  projectedTotal: number
  currentTotal: number
  target: number
  isOverBudget: boolean
  hasSufficientData: boolean
}> {
  // Get current month's transactions
  const result = await sql`
    SELECT tanggal, SUM(nominal) as daily_total
    FROM transaksi
    WHERE jenis = 'pengeluaran' AND to_char(tanggal, 'YYYY-MM') = ${bulan}
    GROUP BY tanggal
    ORDER BY tanggal
  `
  
  const dailySpending = result.rows.map(row => ({
    date: row.tanggal,
    total: Number(row.daily_total),
  }))
  
  // Calculate days in month
  const [year, month] = bulan.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  
  // Calculate days passed
  const today = new Date()
  const currentDay = bulan === today.toISOString().substring(0, 7) 
    ? today.getDate() 
    : daysInMonth
  
  const daysPassed = Math.min(currentDay, daysInMonth)
  
  // Calculate totals
  const currentTotal = dailySpending.reduce((sum, day) => sum + day.total, 0)
  const dailyAverage = daysPassed > 0 ? currentTotal / daysPassed : 0
  
  // Project to end of month
  const projectedTotal = dailyAverage * daysInMonth
  
  // Get target from localStorage (client-side will pass this)
  const target = 0 // Will be set by client
  
  return {
    dailyAverage: Math.round(dailyAverage),
    daysPassed,
    daysInMonth,
    projectedTotal: Math.round(projectedTotal),
    currentTotal,
    target,
    isOverBudget: false, // Will be calculated by client with target
    hasSufficientData: daysPassed >= 3,
  }
}
