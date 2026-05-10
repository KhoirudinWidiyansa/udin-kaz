import { sql } from '@vercel/postgres';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function seed() {
  try {
    console.log('Creating table anggota...');
    await sql`
      CREATE TABLE IF NOT EXISTS anggota (
        id          SERIAL PRIMARY KEY,
        nama        VARCHAR(50) UNIQUE NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    console.log('Table anggota created.');
    
    console.log('Inserting default members...');
    await sql`
      INSERT INTO anggota (nama) VALUES ('Ayah'), ('Ibu')
      ON CONFLICT (nama) DO NOTHING;
    `;
    console.log('Default members inserted.');
    
    console.log('Database anggota setup complete!');
  } catch (err) {
    console.error('Error setting up database anggota:', err);
  }
}

seed();
