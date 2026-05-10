import { NextRequest, NextResponse } from 'next/server'
import { getAllTransactionsForExport } from '@/lib/db'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bulan = searchParams.get('bulan') || undefined

    const transactions = await getAllTransactionsForExport(bulan)

    // Transform data for Excel
    const excelData = transactions.map((t, index) => ({
      'No': index + 1,
      'Tanggal': t.tanggal,
      'Nama': t.nama,
      'Kategori': t.kategori,
      'Nominal (Rp)': t.nominal,
      'Catatan': t.catatan || '-',
    }))

    // Add total row
    const totalNominal = transactions.reduce((sum, t) => sum + t.nominal, 0)
    excelData.push({
      'No': 0,
      'Tanggal': '',
      'Nama': '',
      'Kategori': 'TOTAL',
      'Nominal (Rp)': totalNominal,
      'Catatan': '',
    })

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 12 },  // Tanggal
      { wch: 15 },  // Nama
      { wch: 15 },  // Kategori
      { wch: 18 },  // Nominal
      { wch: 30 },  // Catatan
    ]

    const sheetName = bulan
      ? `Pengeluaran ${bulan}`
      : 'Semua Pengeluaran'
    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31))

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const filename = bulan
      ? `pengeluaran-${bulan}.xlsx`
      : 'pengeluaran-semua.xlsx'

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[GET /api/export] Error:', error)
    return NextResponse.json(
      { error: 'Gagal mengexport data.' },
      { status: 500 }
    )
  }
}
