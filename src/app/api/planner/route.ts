import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { context, budget, items } = body

    if (!budget || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Parameter budget dan items wajib diisi.' },
        { status: 400 }
      )
    }

    const normalizedContext = context?.trim() || 'Rencana Pengeluaran'

    // We generate the 3 scenarios (hemat, sedang, boros) using Gemini
    const { object } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: z.object({
        scenarios: z.array(
          z.object({
            mode: z.enum(['hemat', 'sedang', 'boros']),
            title: z.string(),
            description: z.string(),
            total: z.number(),
            remaining: z.number(),
            status: z.enum(['safe', 'tight', 'over']),
            recommendation: z.string(),
            items: z.array(
              z.object({
                name: z.string(),
                amount: z.number(),
                note: z.string(),
              })
            ),
          })
        ),
      }),
      prompt: `Anda adalah asisten keuangan keluarga yang pintar.
Konteks rencana: "${normalizedContext}"
Budget yang dianggarkan: Rp ${budget}
Daftar item yang ingin dibeli/direncanakan: ${items.join(', ')}

Buatkan 3 skenario anggaran terperinci dalam Bahasa Indonesia:
1. 'hemat': Skenario super hemat, memprioritaskan opsi murah/minimalis agar menyisakan banyak uang cadangan.
2. 'sedang': Skenario sedang/standar, menyeimbangkan kenyamanan dan batas budget dengan opsi harga pasar rata-rata.
3. 'boros': Skenario boros/premium, menggunakan pilihan kualitas tinggi/premium, yang berisiko melewati budget.

Aturan Penting:
- Jumlah harga (total) dari masing-masing skenario harus dihitung dengan benar dari penjumlahan harga item-item di skenario tersebut.
- Sisa budget (remaining) dihitung dengan rumus: budget (${budget}) - total. Bisa bernilai negatif jika total > budget.
- Status ditentukan dengan: 'safe' jika sisa >= 12% dari budget, 'tight' jika sisa antara 0% s.d. 12% dari budget, 'over' jika sisa negatif (< 0).
- Nama item harus dicocokkan dengan input daftar item.
- Nilai amount (harga item) harus dalam Rupiah yang realistis untuk barang tersebut di Indonesia. Bulatkan ke ribuan terdekat (misal: 15000, 24000).
- Note untuk setiap item harus menjelaskan alasan/tips hemat/premium terkait item tersebut.
- Tuliskan rekomendasi singkat secara personal dalam Bahasa Indonesia untuk masing-masing skenario terkait dampaknya pada keuangan keluarga.`,
    })

    return NextResponse.json({ success: true, scenarios: object.scenarios })
  } catch (error: any) {
    console.error('[API Planner Error]:', error)
    return NextResponse.json(
      { error: 'Gagal membuat skenario rencana menggunakan AI. ' + (error?.message || '') },
      { status: 500 }
    )
  }
}
