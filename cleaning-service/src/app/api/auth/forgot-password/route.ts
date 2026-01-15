// ============================================
// AUTH API - Forgot Password (Request Reset)
// ============================================
// POST /api/auth/forgot-password - Send reset email

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { generateSecureToken, hashToken, checkRateLimit } from '@/lib/auth';

interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ForgotPasswordResponse>> {
  try {
    // Rate limiting by IP (5 attempts per hour)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const rateLimitKey = `forgot-${ip}`;
    
    if (!checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000)) {
      // Return same generic message to prevent enumeration
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, link reset password telah dikirim.',
      });
    }

    const body: ForgotPasswordRequest = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email diperlukan' },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    // Even if admin doesn't exist
    if (!admin) {
      return NextResponse.json({
        success: true,
        message: 'Jika email terdaftar, link reset password telah dikirim.',
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = generateSecureToken();
    const hashedToken = hashToken(resetToken);

    admin.passwordResetToken = hashedToken;
    admin.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await admin.save();

    // In production, you would send an email here
    // For now, we'll log the token (REMOVE IN PRODUCTION)
    console.log('=== PASSWORD RESET TOKEN ===');
    console.log(`Email: ${email}`);
    console.log(`Token: ${resetToken}`);
    console.log(`Reset URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/reset-password?token=${resetToken}`);
    console.log('============================');

    // TODO: Implement actual email sending
    // await sendPasswordResetEmail(admin.email, resetToken);

    return NextResponse.json({
      success: true,
      message: 'Jika email terdaftar, link reset password telah dikirim.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
