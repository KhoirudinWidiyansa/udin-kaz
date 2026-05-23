import { NextResponse } from 'next/server';
import { getAnggotaByName } from '@/lib/db';
import { verifyPin, createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { nama, pin } = await request.json();

    if (!nama || !pin) {
      return NextResponse.json({ error: 'Nama dan PIN harus diisi' }, { status: 400 });
    }

    const anggota = await getAnggotaByName(nama);
    if (!anggota) {
      return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
    }

    if (!anggota.pin_hash) {
      // Anggota belum punya PIN -> redirect to setup PIN
      return NextResponse.json({ error: 'NEEDS_PIN_SETUP' }, { status: 403 });
    }

    const isValid = verifyPin(pin, anggota.pin_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'PIN salah' }, { status: 401 });
    }

    // Buat session
    const sessionId = await createSession(nama);
    
    // Set cookie
    cookies().set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // Session berlaku selama browser dibuka (session cookie)
    });

    return NextResponse.json({ success: true, nama });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
