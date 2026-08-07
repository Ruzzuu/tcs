import type { NextRequest } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';

/**
 * Verifies both the signed session cookie and the current database session version.
 * Checking the database makes logout/password-reset session invalidation effective on
 * every protected API route, rather than trusting an otherwise valid old JWT.
 */
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;

  const payload = verifyAuthToken(token);
  if (!payload) return false;

  await connectDB();

  const admin = await Admin.findById(payload.adminId).select('sessionVersion').lean();
  return !!admin && admin.sessionVersion === payload.sessionVersion;
}
