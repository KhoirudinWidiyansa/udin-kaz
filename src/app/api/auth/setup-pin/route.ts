import { NextResponse } from 'next/server';
import { getAnggotaByName } from '@/lib/db';
import { hashPin, createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { nama, pin } = await request.json();

    if (!nama || !pin) {
      return NextResponse.json({ error: 'Nama dan PIN harus diisi' }, { status: 400 });
    }

    if (pin.length < 4) {
      return NextResponse.json({ error: 'PIN minimal 4 digit' }, { status: 400 });
    }

    const anggota = await getAnggotaByName(nama);
    if (!anggota) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    if (anggota.pin_hash) {
      return NextResponse.json({ error: 'PIN sudah pernah di-setup' }, { status: 400 });
    }

    // Hash PIN and save to DB
    const hashed = hashPin(pin);
    await sql`UPDATE anggota SET pin_hash = ${hashed} WHERE nama = ${nama}`;

    // Buat session
    const sessionId = await createSession(nama);
    
    // Set cookie
    cookies().set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({ success: true, nama });
  } catch (error) {
    console.error('Setup PIN error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
