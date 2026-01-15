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
    
    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false });
    }

    await connectDB();

    const admin = await Admin.findById(payload.adminId).select('username email sessionVersion');
    
    if (!admin) {
      return NextResponse.json({ authenticated: false });
    }

    // Check if session version matches (for invalidating sessions)
    if (admin.sessionVersion !== payload.sessionVersion) {
      return NextResponse.json({ authenticated: false });
    }

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
