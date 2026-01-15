// ============================================
// AUTH API - Verify Session
// ============================================
// GET /api/auth/verify - Check if session is valid

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { getAuthCookie, verifyAuthToken } from '@/lib/auth';

interface VerifyResponse {
  authenticated: boolean;
  admin?: {
    id: string;
    username: string;
    email: string;
  };
}

export async function GET(): Promise<NextResponse<VerifyResponse>> {
  try {
    const token = await getAuthCookie();
    console.log('[Verify] Token present:', !!token);
    
    if (!token) {
      console.log('[Verify] No token found');
      return NextResponse.json({ authenticated: false });
    }

    const payload = verifyAuthToken(token);
    console.log('[Verify] Token valid:', !!payload);
    if (!payload) {
      console.log('[Verify] Invalid token');
      return NextResponse.json({ authenticated: false });
    }

    await connectDB();

    const admin = await Admin.findById(payload.adminId).select('username email sessionVersion');
    console.log('[Verify] Admin found:', !!admin);
    
    if (!admin) {
      console.log('[Verify] Admin not found for ID:', payload.adminId);
      return NextResponse.json({ authenticated: false });
    }

    // Check if session version matches (for invalidating sessions)
    if (admin.sessionVersion !== payload.sessionVersion) {
      console.log('[Verify] Session version mismatch');
      return NextResponse.json({ authenticated: false });
    }

    console.log('[Verify] Auth successful for:', admin.username);
    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
