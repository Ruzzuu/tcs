'use client';

// ============================================
// AUTH CONTEXT PROVIDER
// ============================================
// Provides authentication state across admin pages

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verify', {
        credentials: 'include',
        cache: 'no-store',
      });
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
    // Only redirect if not loading and not on a public route already
    // Let the layout handle showing appropriate content
    if (isLoading) return;

    const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));

    if (!admin && !isPublicRoute && pathname?.startsWith('/admin')) {
      // Not authenticated and trying to access protected route
      // Use window.location for a clean redirect
      window.location.href = '/admin/login';
    }
    // Don't auto-redirect from login to admin - let the login page handle that
  }, [admin, isLoading, pathname]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setAdmin(null);
      window.location.href = '/admin/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

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
