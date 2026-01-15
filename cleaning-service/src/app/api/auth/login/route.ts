// ============================================
// AUTH API - Login Endpoint
// ============================================
// POST /api/auth/login - Authenticate admin

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import {
  verifyPassword,
  generateAuthToken,
  setAuthCookie,
  checkRateLimit,
  clearRateLimit,
} from '@/lib/auth';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { username, password } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan password diperlukan' },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    await connectDB();

    // Find admin by username (case-insensitive)
    const admin = await Admin.findOne({ 
      username: username.toLowerCase().trim() 
    });

    // Generic error message to prevent user enumeration
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Clear rate limit on successful login
    clearRateLimit(ip);

    // Update last login
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate token and set cookie
    const token = generateAuthToken(admin._id.toString(), admin.sessionVersion);
    await setAuthCookie(token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
