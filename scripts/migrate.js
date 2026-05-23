require('dotenv').config({ path: '.env.local' });
const { sql } = require('@vercel/postgres');

async function main() {
  console.log('Running migrations...');
  try {
    await sql`ALTER TABLE anggota ADD COLUMN IF NOT EXISTS pin_hash TEXT;`;
    console.log('Added pin_hash to anggota table.');

    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        anggota_nama TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `;
    console.log('Created sessions table.');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

main().catch(console.error);
