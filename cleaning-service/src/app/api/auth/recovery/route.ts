// ============================================
// AUTH API - Emergency Recovery
// ============================================
// POST /api/auth/recovery - Reset using recovery key when locked out

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { hashPassword, verifyRecoveryKey, checkRateLimit } from '@/lib/auth';

interface RecoveryRequest {
  recoveryKey: string;
  newPassword: string;
  newEmail?: string; // Optional: reset email too
}

interface RecoveryResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RecoveryResponse>> {
  try {
    // Strict rate limiting (3 attempts per day)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimitKey = `recovery-${ip}`;
    
    if (!checkRateLimit(rateLimitKey, 3, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan. Coba lagi besok.' },
        { status: 429 }
      );
    }

    const body: RecoveryRequest = await request.json();
    const { recoveryKey, newPassword, newEmail } = body;

    if (!recoveryKey || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Recovery key dan password baru diperlukan' },
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

    // Verify recovery key against environment variable
    if (!verifyRecoveryKey(recoveryKey)) {
      // Log failed attempt for security monitoring
      console.warn(`[SECURITY] Failed recovery attempt from IP: ${ip}`);
      return NextResponse.json(
        { success: false, message: 'Recovery key tidak valid' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find the admin (there should only be one)
    const admin = await Admin.findOne({});

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Admin tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update password
    admin.passwordHash = await hashPassword(newPassword);
    
    // Optionally update email
    if (newEmail) {
      admin.email = newEmail.toLowerCase();
      admin.pendingEmail = undefined;
      admin.emailVerificationToken = undefined;
      admin.emailVerificationExpires = undefined;
    }
    
    // Clear any pending resets
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    
    // Invalidate all sessions
    admin.sessionVersion += 1;
    
    await admin.save();

    console.log(`[SECURITY] Recovery successful from IP: ${ip}`);

    return NextResponse.json({
      success: true,
      message: 'Recovery berhasil. Silakan login dengan password baru.',
    });
  } catch (error) {
    console.error('Recovery error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
