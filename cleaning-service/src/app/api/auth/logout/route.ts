// ============================================
// AUTH API - Logout Endpoint
// ============================================
// POST /api/auth/logout - Clear session

import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST(): Promise<NextResponse> {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
