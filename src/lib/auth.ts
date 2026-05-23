import { sql } from '@vercel/postgres';
import crypto from 'crypto';

export const SESSION_COOKIE_NAME = 'kas_keluarga_session';

// Gunakan AUTH_SECRET dari env, atau fallback (TIDAK AMAN UNTUK PRODUCTION TANPA ENV)
const SECRET = process.env.AUTH_SECRET || 'kas_keluarga_default_secret_key_123';

/**
 * Hash PIN menggunakan SHA-256 + salt
 */
export function hashPin(pin: string): string {
  const hash = crypto.createHmac('sha256', SECRET).update(pin).digest('hex');
  return hash;
}

/**
 * Verifikasi PIN
 */
export function verifyPin(pin: string, hash: string): boolean {
  const expectedHash = hashPin(pin);
  return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(hash));
}

export interface Session {
  id: string;
  anggota_nama: string;
  created_at: string;
  expires_at: string;
}

/**
 * Buat sesi baru di database
 */
export async function createSession(nama: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  // Session expires in 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await sql`
    INSERT INTO sessions (id, anggota_nama, expires_at)
    VALUES (${sessionId}, ${nama}, ${expiresAt.toISOString()})
  `;
  
  return sessionId;
}

/**
 * Ambil sesi yang valid
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  if (!sessionId) return null;
  
  const result = await sql`
    SELECT id, anggota_nama, created_at, expires_at 
    FROM sessions 
    WHERE id = ${sessionId} AND expires_at > NOW()
  `;
  
  if (result.rows.length === 0) return null;
  
  const row = result.rows[0];
  return {
    id: row.id,
    anggota_nama: row.anggota_nama,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    expires_at: row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at),
  };
}

/**
 * Hapus sesi (Logout)
 */
export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}
