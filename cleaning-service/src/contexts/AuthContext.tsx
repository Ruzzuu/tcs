'use client';

// ============================================
// AUTH CONTEXT PROVIDER
// ============================================
// Provides authentication state across admin pages

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Admin {
  id: string;
  username: string;
  email: string;
}

interface AuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Public routes that don't require authentication
const publicRoutes = ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/admin/recovery', '/admin/seed'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verify');
      const data = await res.json();

      if (data.authenticated && data.admin) {
        setAdmin(data.admin);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    // Skip redirect logic while loading
    if (isLoading) return;

    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

    if (!admin && !isPublicRoute && pathname?.startsWith('/admin')) {
      // Not authenticated and trying to access protected route
      router.replace('/admin/login');
    } else if (admin && isPublicRoute) {
      // Authenticated but on public route - redirect to admin
      router.replace('/admin');
    }
  }, [admin, isLoading, pathname, router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setAdmin(null);
      router.replace('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
