# Directive: Fetch Transactions

## Tujuan
Mengambil data transaksi dari Google Sheets dan menampilkannya di Dashboard.

## Input
- Tidak ada input dari user (publik endpoint)
- Query params opsional: `?limit=20` (default 20)

## Alur (Langkah-langkah)

1. **Server Component / Client Fetch** (`Dashboard.tsx` atau `page.tsx`):
   - Fetch ke `GET /api/transactions` dengan ISR revalidate 30 detik
   - Tampilkan loading skeleton saat data belum ada
   - Render saldo total + list transaksi

2. **API Route** (`/api/transactions`):
   - Inisialisasi Google Sheets client
   - Baca semua baris dari sheet "Transaksi" (kolom A:H)
   - Skip baris pertama (header)
   - Parse setiap baris menjadi objek transaksi
   - Hitung saldo: sum(pemasukan) - sum(pengeluaran)
   - Sort descending by timestamp
   - Return `limit` transaksi terakhir
   - Set Cache-Control header: `s-maxage=30, stale-while-revalidate`

3. **Google Sheets** (via `src/lib/sheets.ts`):
   - `sheets.getRows()` — baca range A:H dari sheet "Transaksi"
   - Return array of rows (tanpa header)

## Output
```json
{
  "saldo": 1500000,
  "transaksi": [
    {
      "id": "abc123",
      "timestamp": "2026-04-04T09:00:00Z",
      "tanggal": "2026-04-04",
      "jenis": "pemasukan",
      "nominal": 2000000,
      "kategori": "Lainnya",
      "nama": "Ayah",
      "catatan": "Gaji bulan April"
    }
  ]
}
```

## Edge Cases
- **Sheet kosong** (hanya header): Return `{ saldo: 0, transaksi: [] }`
- **Baris malformed** (kolom kurang): Skip baris tersebut, log warning
- **Sheets API lambat** (> 5 detik): ISR akan serve stale data dari cache
- **GOOGLE_SHEET_ID tidak ada**: Return 500 + error message di server log

## Update Log
- 2026-04-04: Directive dibuat
