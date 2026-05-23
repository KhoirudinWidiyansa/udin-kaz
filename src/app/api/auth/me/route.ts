import { NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionId = cookies().get(SESSION_COOKIE_NAME)?.value;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await getSession(sessionId);
    
    if (!session) {
      // Session di DB sudah hapus/expired, bersihkan cookie
      cookies().delete(SESSION_COOKIE_NAME);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      nama: session.anggota_nama 
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}
