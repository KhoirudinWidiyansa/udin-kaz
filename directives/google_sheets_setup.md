# Directive: Google Sheets Setup

## Tujuan
Menyiapkan Google Sheets sebagai database untuk aplikasi Kas Keluarga.

## Langkah-langkah Manual (dilakukan satu kali oleh admin)

### 1. Buat Google Spreadsheet
1. Buka [Google Sheets](https://sheets.google.com) → Buat spreadsheet baru
2. Namai spreadsheet: **"Kas Keluarga"**
3. Rename Sheet1 menjadi: **"Transaksi"**
4. Buat header di baris pertama (kolom A–H):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| Timestamp | Tanggal | Jenis | Nominal | Kategori | Nama | Catatan | ID |

5. Catat **Spreadsheet ID** dari URL:
   `https://docs.google.com/spreadsheets/d/**SPREADSHEET_ID**/edit`

### 2. Setup Google Cloud Project
1. Buka [Google Cloud Console](https://console.cloud.google.com)
2. Buat Project baru → nama: "kas-keluarga"
3. Enable **Google Sheets API**: APIs & Services → Enable APIs → cari "Google Sheets API"
4. Buat **Service Account**:
   - IAM & Admin → Service Accounts → Create Service Account
   - Nama: "kas-sheets-writer"
   - Role: **Editor** (atau custom dengan Sheets access)
   - Buat Key → tipe JSON → download → simpan sebagai `credentials.json` di root project

### 3. Share Spreadsheet ke Service Account
1. Buka file `credentials.json` → catat nilai `client_email` (contoh: `kas-sheets-writer@project.iam.gserviceaccount.com`)
2. Di Google Sheets → klik Share → tambahkan email Service Account → role **Editor**

### 4. Konfigurasi Environment Variables
Salin `.env.example` → `.env.local`, lalu isi:

```env
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
```

> **Note:** `GOOGLE_CREDENTIALS_JSON` adalah seluruh isi file `credentials.json` dalam format string JSON satu baris.

## Edge Cases & Catatan
- **Quota API**: Google Sheets API gratis punya limit 300 requests/menit per project. Untuk keluarga kecil ini lebih dari cukup.
- **Rate limit**: Jika terkena limit, Next.js ISR dengan `revalidate: 30` akan mengurangi frekuensi baca.
- **Baris kosong**: Pastikan tidak ada baris kosong di tengah data Sheets, ini bisa mengganggu pembacaan range.
- **Kolom baru**: Jangan hapus/pindah kolom yang sudah ada. Tambahan kolom baru selalu di akhir.

## Update Log
- 2026-04-04: Directive dibuat
