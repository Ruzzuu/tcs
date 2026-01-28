// ============================================
// AUTH API - Seed Initial Admin
// ============================================
// POST /api/auth/seed - Create initial admin (one-time use)
// This endpoint only works if no admin exists yet

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';
import { hashPassword } from '@/lib/auth';

interface SeedRequest {
  username: string;
  password: string;
  email: string;
  seedKey: string; // Must match ADMIN_SEED_KEY env var
}

interface SeedResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<SeedResponse>> {
  try {
    const body: SeedRequest = await request.json();
    const { username, password, email, seedKey } = body;

    // Verify seed key
    const expectedSeedKey = process.env.ADMIN_SEED_KEY;
    if (!expectedSeedKey) {
      return NextResponse.json(
        { success: false, message: 'Seed key not configured' },
        { status: 500 }
      );
    }

    if (seedKey !== expectedSeedKey) {
      return NextResponse.json(
        { success: false, message: 'Invalid seed key' },
        { status: 401 }
      );
    }

    // Validation
    if (!username || !password || !email) {
      return NextResponse.json(
        { success: false, message: 'Username, password, dan email diperlukan' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin sudah ada' },
        { status: 400 }
      );
    }

    // Create admin
    const passwordHash = await hashPassword(password);
    
    const admin = new Admin({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      sessionVersion: 0,
    });

    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Admin berhasil dibuat',
    });
  } catch (error) {
    console.error('Seed admin error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
