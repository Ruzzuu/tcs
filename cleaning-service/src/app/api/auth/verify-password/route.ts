import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, getAuthCookie, verifyPassword } from '@/lib/auth';
import Admin from '@/lib/models/Admin';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthCookie();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const payload = verifyAuthToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const admin = await Admin.findById(payload.adminId).select('passwordHash');

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    const isPasswordValid = await verifyPassword(password, admin.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}
