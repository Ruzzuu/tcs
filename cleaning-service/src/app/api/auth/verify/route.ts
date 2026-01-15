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

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse<VerifyResponse>> {
  // Create response headers to prevent caching
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    const token = await getAuthCookie();
    
    if (!token) {
      return NextResponse.json({ authenticated: false }, { headers });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { headers });
    }

    await connectDB();

    const admin = await Admin.findById(payload.adminId).select('username email sessionVersion');
    
    if (!admin) {
      return NextResponse.json({ authenticated: false }, { headers });
    }

    // Check if session version matches (for invalidating sessions)
    if (admin.sessionVersion !== payload.sessionVersion) {
      return NextResponse.json({ authenticated: false }, { headers });
    }

    return NextResponse.json({
      authenticated: true,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email,
      },
    }, { headers });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ authenticated: false }, { 
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      }
    });
  }
}
