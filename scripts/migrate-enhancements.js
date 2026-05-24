require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function main() {
  console.log('Running enhancements migration...');
  
  try {
    // Create budget_kategori table
    await sql`
      CREATE TABLE IF NOT EXISTS budget_kategori (
        id SERIAL PRIMARY KEY,
        kategori VARCHAR(50) NOT NULL,
        limit BIGINT NOT NULL CHECK (limit > 0),
        bulan VARCHAR(7) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(kategori, bulan)
      );
    `;
    console.log('✓ Created budget_kategori table');

    // Create index for budget_kategori
    await sql`
      CREATE INDEX IF NOT EXISTS idx_budget_kategori_lookup 
      ON budget_kategori(kategori, bulan);
    `;
    console.log('✓ Created budget_kategori index');

    // Create transaksi_split table
    await sql`
      CREATE TABLE IF NOT EXISTS transaksi_split (
        id SERIAL PRIMARY KEY,
        transaksi_id INTEGER NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
        kategori VARCHAR(50) NOT NULL,
        nominal BIGINT NOT NULL CHECK (nominal > 0),
        catatan TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('✓ Created transaksi_split table');

    // Create indexes for transaksi_split
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transaksi_split_transaksi 
      ON transaksi_split(transaksi_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transaksi_split_kategori 
      ON transaksi_split(kategori, created_at);
    `;
    console.log('✓ Created transaksi_split indexes');

    console.log('\n✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
