import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function seed() {
  try {
    console.log('Creating table...');
    await sql`
      CREATE TABLE IF NOT EXISTS transaksi (
        id          SERIAL PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tanggal     DATE        NOT NULL,
        jenis       VARCHAR(11) NOT NULL CHECK (jenis IN ('pemasukan', 'pengeluaran')),
        nominal     BIGINT      NOT NULL CHECK (nominal > 0),
        kategori    VARCHAR(50) NOT NULL,
        nama        VARCHAR(50) NOT NULL,
        catatan     TEXT        DEFAULT ''
      );
    `;
    console.log('Table created or already exists.');
    
    console.log('Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transaksi_created_at ON transaksi (created_at DESC);
    `;
    console.log('Index created or already exists.');
    
    console.log('Database setup complete!');
  } catch (err) {
    console.error('Error setting up database:', err);
  }
}

seed();
