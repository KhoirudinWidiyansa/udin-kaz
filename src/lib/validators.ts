import { z } from 'zod'

export const KATEGORI_LIST = [
  'Makan',
  'Transportasi',
  'Tagihan',
  'Belanja',
  'Menabung',
  'Lainnya',
] as const

export const NAMA_ANGGOTA_DEFAULT = [
  'Ayah',
  'Ibu',
] as const

export const transactionSchema = z.object({
  jenis: z.enum(['pengeluaran'], {
    required_error: 'Jenis transaksi wajib dipilih',
    invalid_type_error: 'Jenis harus pengeluaran',
  }),
  nominal: z
    .number({
      required_error: 'Nominal wajib diisi',
      invalid_type_error: 'Nominal harus berupa angka',
    })
    .positive('Nominal harus lebih dari 0')
    .max(1_000_000_000_000, 'Nominal terlalu besar'),
  kategori: z.string().min(1, 'Kategori wajib dipilih'),
  nama: z.string().min(1, 'Nama anggota wajib diisi').max(50, 'Nama terlalu panjang'),
  tanggal: z
    .string()
    .min(1, 'Tanggal wajib diisi')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  catatan: z.string().max(200, 'Catatan maksimal 200 karakter').optional().default(''),
})

export type TransactionInput = z.infer<typeof transactionSchema>
