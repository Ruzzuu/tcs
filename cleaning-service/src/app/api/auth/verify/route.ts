// ============================================
// AUTH API - Verify Session
// ============================================
// GET /api/auth/verify - Check if session is valid

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { verifyAuthToken } from '@/lib/auth';

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

export async function GET(request: NextRequest): Promise<NextResponse<VerifyResponse>> {
  // Create response headers to prevent caching
  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  try {
    // Debug: log environment
    console.log('[Verify] ENV Check - JWT_SECRET:', !!process.env.JWT_SECRET);
    console.log('[Verify] ENV Check - MONGODB_URI:', !!process.env.MONGODB_URI);
    
    // Read cookie directly from request
    const token = request.cookies.get('admin_session')?.value;
    
    // Debug: log all cookies
    const allCookies = request.cookies.getAll();
    console.log('[Verify] All cookies:', allCookies.map(c => c.name));
    console.log('[Verify] Cookie present:', !!token);
    
    if (!token) {
      console.log('[Verify] No token found in cookies');
      return NextResponse.json({ authenticated: false }, { headers });
    }

    const payload = verifyAuthToken(token);
    console.log('[Verify] Token verification result:', !!payload);
    if (payload) {
      console.log('[Verify] Payload adminId:', payload.adminId);
    }
    
    if (!payload) {
      console.log('[Verify] Token verification failed - invalid JWT');
      return NextResponse.json({ authenticated: false }, { headers });
    }

    console.log('[Verify] Connecting to MongoDB...');
    await connectDB();
    console.log('[Verify] MongoDB connected');

    const admin = await Admin.findById(payload.adminId).select('username email sessionVersion');
    console.log('[Verify] Admin found:', !!admin);
    
    if (!admin) {
      console.log('[Verify] Admin not found in database');
      return NextResponse.json({ authenticated: false }, { headers });
    }

    // Check if session version matches (for invalidating sessions)
    console.log('[Verify] Session version check:', admin.sessionVersion, '===', payload.sessionVersion);
    if (admin.sessionVersion !== payload.sessionVersion) {
      console.log('[Verify] Session version mismatch');
      return NextResponse.json({ authenticated: false }, { headers });
    }

    console.log('[Verify] SUCCESS - Admin authenticated:', admin.username);
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
