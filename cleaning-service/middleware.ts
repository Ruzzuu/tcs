import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/admin/login',
  '/admin/forgot-password', 
  '/admin/reset-password',
  '/admin/recovery',
  '/admin/seed',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip non-admin routes and API routes
  if (!pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Check if it's a public route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Get the auth cookie
  const token = request.cookies.get('admin_session')?.value;
  
  // If accessing protected admin route without token, redirect to login
  if (!isPublicRoute && !token) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // If accessing login page with token, redirect to admin dashboard
  // But only for exact /admin/login path to avoid loops
  if (pathname === '/admin/login' && token) {
    const adminUrl = new URL('/admin', request.url);
    return NextResponse.redirect(adminUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match admin routes but exclude API and static files
    '/admin/:path*',
  ],
};
