// ============================================
// AUTH UTILITIES - Secure Authentication Helpers
// ============================================

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const RECOVERY_KEY = process.env.ADMIN_RECOVERY_KEY || '';

// ============================================
// PASSWORD HASHING
// ============================================

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// JWT TOKEN MANAGEMENT
// ============================================

interface JWTPayload {
  adminId: string;
  sessionVersion: number;
  iat?: number;
  exp?: number;
}

export function generateAuthToken(adminId: string, sessionVersion: number): string {
  const payload: JWTPayload = {
    adminId,
    sessionVersion,
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token valid for 7 days
  });
}

export function verifyAuthToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

// ============================================
// SECURE TOKEN GENERATION (for password reset, email verification)
// ============================================

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ============================================
// COOKIE MANAGEMENT
// ============================================

const AUTH_COOKIE_NAME = 'admin_session';

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

// ============================================
// RECOVERY KEY VERIFICATION
// ============================================

export function verifyRecoveryKey(key: string): boolean {
  if (!RECOVERY_KEY) {
    console.error('ADMIN_RECOVERY_KEY not set in environment variables');
    return false;
  }
  return key === RECOVERY_KEY;
}

// ============================================
// EMAIL VALIDATION
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================
// RATE LIMITING (simple in-memory)
// ============================================

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export function checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if window has passed
  if (now - attempts.lastAttempt > windowMs) {
    loginAttempts.set(identifier, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Check if too many attempts
  if (attempts.count >= maxAttempts) {
    return false;
  }
  
  // Increment
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

export function clearRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}
