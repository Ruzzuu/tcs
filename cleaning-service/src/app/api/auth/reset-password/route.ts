// ============================================
// AUTH API - Reset Password
// ============================================
// POST /api/auth/reset-password - Reset password with token

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { hashPassword, hashToken, checkRateLimit } from '@/lib/auth';

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    // Rate limiting by IP (10 attempts per hour)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimitKey = `reset-${ip}`;
    
    if (!checkRateLimit(rateLimitKey, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' },
        { status: 429 }
      );
    }

    const body: ResetPasswordRequest = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Token dan password baru diperlukan' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    await connectDB();

    const hashedToken = hashToken(token);
    
    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Token tidak valid atau sudah kadaluarsa' },
        { status: 400 }
      );
    }

    // Update password and invalidate all sessions
    admin.passwordHash = await hashPassword(newPassword);
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    admin.sessionVersion += 1; // Invalidate all existing sessions
    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Password berhasil direset. Silakan login.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
