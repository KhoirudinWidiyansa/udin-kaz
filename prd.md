# Product Requirements Document (PRD): Sistem Kas Keluarga

## 1. Ringkasan Eksekutif (Executive Summary)

Sebuah aplikasi web ringan (PWA) untuk mencatat pengeluaran dan pemasukan keluarga secara kolaboratif. Aplikasi ini dirancang dengan hambatan masuk ( *barrier to entry* ) serendah mungkin:  **tanpa registrasi, tanpa password, dan tanpa proses login** . Pengguna cukup membuka tautan dan langsung bisa mencatat pengeluaran.

## 2. Tujuan & Metrik Keberhasilan

* **Tujuan:** Memudahkan seluruh anggota keluarga untuk mencatat keuangan harian dalam hitungan detik dari *smartphone* masing-masing tanpa harus mengerti teknologi atau mengingat  *password* .
* **Metrik Keberhasilan:**
  * Waktu yang dibutuhkan untuk mencatat 1 transaksi < 10 detik.
  * Waktu *loading* aplikasi awal di bawah 3 detik.
  * Data tersinkronisasi dengan baik di Google Sheets tanpa *error* limit API.

## 3. Asumsi & Batasan (Constraints)

* **Aksesibilitas:** Diakses via Web browser dan mendukung fitur "Add to Home Screen" (PWA).
* **Tanpa Otentikasi:** Keamanan murni mengandalkan kerahasiaan tautan web (URL  *obscured* ).
* **Skalabilitas:** Karena menggunakan Google Sheets, trafik didesain untuk skala kecil (penggunaan keluarga), bukan untuk ribuan *request* bersamaan.

## 4. Tumpukan Teknologi (Tech Stack)

* **Frontend (UI & PWA): Next.js (App Router / Pages Router)**
  * Memanfaatkan React untuk membangun antarmuka yang cepat dan responsif.
  * Menggunakan *library* pendukung seperti `next-pwa` untuk mempermudah konfigurasi *Service Worker* dan *manifest.json* agar web bisa diinstal di HP.
* **Backend (API & Logika): Next.js API Routes**
  * Bertindak sebagai *proxy* atau jembatan antara *frontend* dan  *database* .
  * Tugas utamanya adalah memvalidasi data yang dikirim keluarga, lalu meneruskannya ke Google Sheets secara aman.
* **Database: Google Sheets API**
  * Menggunakan akun Google Service Account (`.json` credentials) untuk proses otentikasi server-to-server.
  * Data disimpan dalam format baris dan kolom konvensional, sehingga bisa diolah lebih lanjut (menggunakan rumus/pivot) oleh admin keluarga secara manual jika diperlukan.
* **Deployment & Hosting: Vercel**
  * Platform optimal untuk Next.js dengan fitur *deployment* otomatis langsung dari repository (GitHub/GitLab).
  * Mengamankan kredensial Google Sheets menggunakan sistem *Environment Variables* bawaan Vercel.

## 5. Kebutuhan Fitur Utama (Core Features)

### A. Tampilan Papan Utama (Dashboard)

* **Saldo Saat Ini:** Total Pemasukan - Total Pengeluaran.
* **Daftar Transaksi Terakhir:** Menampilkan 10-20 transaksi terakhir secara urut waktu.
* *Note Teknis:* Data ini diambil via Next.js secara *Server-Side Rendering (SSR)* atau menggunakan *Client-side fetching* (seperti SWR/React Query) dengan *caching* ringan agar tidak terlalu sering "mengetuk" Google Sheets API.

### B. Form Input Transaksi (Add Transaction)

* **Jenis Transaksi:** *Toggle button* (Pemasukan / Pengeluaran).
* **Nominal:** *Text field* format angka/Rupiah.
* **Kategori:** *Dropdown* (Makan, Transportasi, Tagihan, Belanja, Lainnya).
* **Identitas (Pengganti Auth):** *Dropdown* nama anggota keluarga. Pilihan nama terakhir disimpan di *Local Storage* browser agar form berikutnya otomatis terisi.
* **Tanggal & Catatan:** Otomatis hari ini (bisa diubah) dan kolom teks opsional.

## 6. Keamanan & Mitigasi Tanpa Auth

* **URL Rahasia (Obscured URL):** Aplikasi di-*deploy* di Vercel dengan *path* khusus yang panjang/acak (misal: `namakeluarga-app.vercel.app/kas-rahasia-x829`).
* **Server-Side API Calls:** *Frontend* sama sekali tidak tahu alamat spreadsheet atau kredensial Google. Semua disembunyikan di balik rute `/api/add-transaction` milik Next.js.
* **Pembatasan Hapus (No Delete Function on UI):** Untuk mencegah data terhapus secara tidak sengaja oleh keluarga, antarmuka web hanya menyediakan opsi  **Tambah Data** . Modifikasi atau penghapusan data hanya bisa dilakukan oleh pembuat aplikasi langsung di *file* Google Sheets.

## 7. Rencana Fase Pengembangan (Milestones)

* **Fase 1 (Database & API):** Pembuatan *file* Google Sheets, setup Google Cloud Console (Service Account), dan testing penulisan data via Postman ke Next.js API Route lokal.
* **Fase 2 (UI/UX Frontend):** Membangun form *input* dan halaman *dashboard* dengan Next.js dan Tailwind CSS (opsional untuk *styling* cepat).
* **Fase 3 (Integrasi & PWA):** Menghubungkan form ke API, mengatur  *loading state* , dan menambahkan konfigurasi PWA.
* **Fase 4 (Deployment):** Push kode ke GitHub, hubungkan ke Vercel, atur  *Environment Variables* , dan bagikan URL ke grup keluarga.
