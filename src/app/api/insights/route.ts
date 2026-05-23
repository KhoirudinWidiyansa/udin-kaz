import { NextResponse } from 'next/server'
import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { monthlyTarget, totalPengeluaran, totalCount, categorySummary, transaksi } = body

    if (totalPengeluaran === undefined || !Array.isArray(categorySummary)) {
      return NextResponse.json(
        { error: 'Data pengeluaran tidak lengkap.' },
        { status: 400 }
      )
    }

    // 1. Calculate top categories mathematically to ensure absolute correctness
    const topCategories = categorySummary.map(item => {
      const count = item.count ?? (transaksi ? transaksi.filter((t: any) => t.kategori === item.kategori).length : 0)
      const percentage = totalPengeluaran > 0 ? (item.total / totalPengeluaran) * 100 : 0
      return {
        kategori: item.kategori,
        total: item.total,
        count,
        percentage,
      }
    })

    const ratio = monthlyTarget > 0 ? totalPengeluaran / monthlyTarget : null

    // 2. Prepare transaction summary for Gemini context
    // We send only the latest 30 transactions to avoid token bloat and stay highly relevant
    const recentTx = Array.isArray(transaksi) ? transaksi.slice(0, 30) : []
    const txContext = recentTx
      .map((t: any) => `- Tanggal: ${t.tanggal}, Item: "${t.catatan || 'Pengeluaran'}", Kategori: ${t.kategori}, Nominal: Rp ${t.nominal}, Anggota: ${t.nama || 'Umum'}`)
      .join('\n')

    const categoryContext = topCategories
      .map(c => `- Kategori ${c.kategori}: Total Rp ${c.total} (${c.count} transaksi, ${Math.round(c.percentage)}%)`)
      .join('\n')

    // 3. Let Gemini analyze the habits and generate a premium, personalized review
    const { object } = await generateObject({
      model: google('gemini-2.5-flash-lite'),
      schema: z.object({
        status: z.enum(['Sangat Hemat', 'Sesuai Target', 'Cenderung Boros', 'Kritis/Sangat Boros', 'Butuh Target']),
        severity: z.enum(['good', 'neutral', 'warning', 'danger']),
        score: z.number().min(0).max(100),
        headline: z.string(),
        recommendations: z.array(
          z.object({
            type: z.enum(['reduce', 'eliminate']),
            title: z.string(),
            detail: z.string(),
            potentialSaving: z.number(),
            severity: z.enum(['good', 'neutral', 'warning', 'danger']),
          })
        ).max(3),
      }),
      prompt: `Anda adalah perencana keuangan keluarga premium berbasis AI.
Tugas Anda adalah menganalisis data pengeluaran bulanan dan transaksi terkini dari sebuah keluarga, lalu memberikan feedback terperinci dalam Bahasa Indonesia.

Data Keuangan Bulan Ini:
- Target Batas Pengeluaran Bulanan: ${monthlyTarget > 0 ? 'Rp ' + monthlyTarget : 'Belum ditentukan'}
- Total Pengeluaran Aktual: Rp ${totalPengeluaran}
- Jumlah Transaksi: ${totalCount}
- Rasio Pengeluaran terhadap Target: ${ratio !== null ? (ratio * 100).toFixed(1) + '%' : 'N/A'}

Ringkasan Pengeluaran per Kategori:
${categoryContext}

Daftar 30 Transaksi Terkini:
${txContext || '(Belum ada transaksi tercatat)'}

Instruksi Output:
1. 'status': Tentukan tingkat pengeluaran dari:
   - 'Butuh Target' (jika target belum diset/0)
   - 'Sangat Hemat' (pengeluaran jauh di bawah target, rasio <= 65%)
   - 'Sesuai Target' (rasio 66% - 100%)
   - 'Cenderung Boros' (rasio 101% - 125%)
   - 'Kritis/Sangat Boros' (rasio > 125%)
2. 'severity': 'good' (untuk Sangat Hemat), 'neutral' (untuk Sesuai Target/Butuh Target), 'warning' (untuk Cenderung Boros), 'danger' (untuk Kritis).
3. 'score': Nilai skor kesehatan keuangan dari 0 hingga 100 (100 adalah terbaik/terhemat, 0 adalah paling kritis/boros).
4. 'headline': 1-2 kalimat yang menarik, ringkas, dan persuasif tentang status pengeluaran mereka bulan ini secara spesifik.
5. 'recommendations': Berikan maksimal 3 saran pemotongan anggaran konkret berdasarkan transaksi yang ada. Sebutkan nama barang/transaksi spesifik jika ada pola belanja impulsif (seperti makan di luar terlalu sering, langganan berlebih, belanja online).
   Setiap saran berisi:
   - 'type': 'reduce' (untuk dikurangi) atau 'eliminate' (untuk dihentikan/dihindari).
   - 'title': Judul singkat saran (misal: "Batasi Kopi Kekinian" atau "Audit Pengeluaran Shopee").
   - 'detail': Penjelasan detail mengapa dan bagaimana cara menghematnya, dalam Bahasa Indonesia yang ramah tapi tegas.
   - 'potentialSaving': Perkiraan jumlah nominal Rupiah yang bisa dihemat (misal: 150000). Harus realistis berdasarkan data nominal transaksi mereka.
   - 'severity': Tingkat urgensi rekomendasi ('good', 'neutral', 'warning', 'danger').`,
    })

    return NextResponse.json({
      success: true,
      insight: {
        status: object.status,
        severity: object.severity,
        score: object.score,
        ratio,
        headline: object.headline,
        recommendations: object.recommendations,
        topCategories,
      },
    })
  } catch (error: any) {
    console.error('[API Insights Error]:', error)
    return NextResponse.json(
      { error: 'Gagal menganalisis keuangan menggunakan AI. ' + (error?.message || '') },
      { status: 500 }
    )
  }
}
