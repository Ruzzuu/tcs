// ============================================
// DEBUG ENDPOINT - TEMPORARY
// ============================================
// DELETE THIS FILE AFTER DEBUGGING!

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  const allCookies = request.cookies.getAll();
  
  const debug: Record<string, unknown> = {
    cookieNames: allCookies.map(c => c.name),
    hasToken: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 20)}...${token.substring(token.length - 20)}` : null,
    jwtSecretSet: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    mongoUriSet: !!process.env.MONGODB_URI,
  };

  // Try to decode without verification first
  if (token) {
    try {
      const decoded = jwt.decode(token);
      debug.decodedPayload = decoded;
    } catch (e) {
      debug.decodeError = String(e);
    }

    // Try to verify with secret
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
      const verified = jwt.verify(token, secret);
      debug.verified = true;
      debug.verifiedPayload = verified;
    } catch (e: unknown) {
      debug.verified = false;
      debug.verifyError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(debug);
}
