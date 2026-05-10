# Directive: Add Transaction

## Tujuan
Menangani alur penambahan transaksi baru dari form frontend ke Google Sheets.

## Input
Form dari user berisi:
- `jenis`: "pemasukan" | "pengeluaran"
- `nominal`: number (dalam Rupiah, tanpa desimal)
- `kategori`: "Makan" | "Transportasi" | "Tagihan" | "Belanja" | "Lainnya"
- `nama`: string (nama anggota keluarga)
- `tanggal`: string (format YYYY-MM-DD, default hari ini)
- `catatan`: string (opsional, bisa kosong)

## Alur (Langkah-langkah)

1. **Frontend** (`TransactionForm.tsx`):
   - User mengisi form → klik tombol "Catat"
   - Validasi client-side (field required tidak kosong)
   - `fetch('POST /api/add-transaction', { body: JSON.stringify(data) })`
   - Tampilkan loading state selama request
   - Jika sukses: reset form, tampilkan toast sukses, trigger refetch dashboard
   - Jika gagal: tampilkan pesan error

2. **API Route** (`/api/add-transaction`):
   - Parse request body
   - Validasi dengan Zod schema (lihat `src/lib/validators.ts`)
   - Jika invalid → return `400 Bad Request` + pesan error
   - Generate `id` unik (nanoid atau timestamp)
   - Generate `timestamp` server (ISO 8601)
   - Panggil `sheets.appendRow()` dari `src/lib/sheets.ts`
   - Jika Sheets error → return `500 Internal Server Error`
   - Jika sukses → return `200 OK` + data transaksi yang baru dibuat
   - Trigger `revalidatePath('/')` untuk invalidate ISR cache

3. **Google Sheets** (via `src/lib/sheets.ts`):
   - Append satu baris baru ke sheet "Transaksi"
   - Format baris: [timestamp, tanggal, jenis, nominal, kategori, nama, catatan, id]

## Output
- Response JSON: `{ success: true, transaction: { id, timestamp, ... } }`
- Baris baru tersimpan di Google Sheets

## Edge Cases
- **Nominal non-angka**: Zod validasi `z.number().positive()`
- **Nominal sangat besar** (> 1 miliar): tetap diterima, tidak ada batasan bisnis
- **XSS di catatan**: Sanitasi di server, simpan sebagai plain text
- **Sheets unreachable**: Return 503 + message "Gagal menyimpan, coba lagi"
- **Nama keluarga baru**: Tidak ada validasi whitelist — siapapun bisa input nama

## Update Log
- 2026-04-04: Directive dibuat
