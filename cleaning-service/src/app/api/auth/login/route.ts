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
  identifier?: string;  // email or username (from login page)
  username?: string;    // legacy support
  password: string;
}

interface LoginResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { identifier, username, password } = body;
    
    // Support both 'identifier' and 'username' fields
    const loginIdentifier = identifier || username;

    // Validation
    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Username/email dan password diperlukan' },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    await connectDB();

    // Find admin by username OR email (case-insensitive)
    const searchValue = loginIdentifier.toLowerCase().trim();
    const admin = await Admin.findOne({ 
      $or: [
        { username: searchValue },
        { email: searchValue }
      ]
    });

    // Generic error message to prevent user enumeration
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Username atau password salah' },
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
