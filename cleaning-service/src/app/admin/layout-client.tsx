'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Public routes that don't need the admin shell (header, nav)
const publicAuthRoutes = ['/admin/login', '/admin/forgot-password', '/admin/reset-password', '/admin/recovery', '/admin/seed'];

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { admin, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/orders', label: 'Form', icon: 'edit_note' },
    { href: '/admin/report', label: 'Report', icon: 'assessment' },
  ];

  // Check if current route is a public auth route
  const isPublicAuthRoute = publicAuthRoutes.some(route => pathname?.startsWith(route));

  // If on a public auth route, just render children without the admin shell
  if (isPublicAuthRoute) {
    return <>{children}</>;
  }

  // If still loading auth state, show loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
      </div>
    );
  }

  // If not authenticated after loading, redirect to login
  if (!admin) {
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-white dark:bg-[#1a202c] p-4 border-b border-gray-100 dark:border-gray-800 justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-[#111318] dark:text-white flex size-10 shrink-0 items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full lg:hidden"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <img 
              src="https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/f_auto,q_auto,w_200/v1768543427/logo_tcs_keooto.png" 
              alt="Teman Cuci Sepatu" 
              className="w-8 h-8 object-contain"
            />
            <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block">
              Teman Cuci Sepatu
            </h2>
          </Link>
        </div>
        
        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-[#1152d4] text-white'
                  : 'text-[#616f89] hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={toggleTheme}
            className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-[#111318] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined">
              {theme === 'light' ? 'dark_mode' : 'light_mode'}
            </span>
          </button>
          <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-[#111318] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          {/* User Menu with Logout */}
          <div className="relative">
            <button 
              onClick={() => setShowLogoutMenu(!showLogoutMenu)}
              className="h-8 w-8 rounded-full bg-[#1152d4]/20 flex items-center justify-center text-[#1152d4] font-bold text-xs border border-[#1152d4]/10 hover:bg-[#1152d4]/30 transition-colors cursor-pointer"
            >
              {admin?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </button>
            
            {showLogoutMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowLogoutMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a202c] rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm font-medium text-[#111318] dark:text-white truncate">{admin?.username}</p>
                    <p className="text-xs text-[#616f89] truncate">{admin?.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowLogoutMenu(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#1a202c] z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <img 
              src="https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/f_auto,q_auto,w_200/v1768543427/logo_tcs_keooto.png" 
              alt="Teman Cuci Sepatu" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h2 className="text-[#111318] dark:text-white font-bold">Teman Cuci Sepatu</h2>
              <p className="text-xs text-[#616f89]">Admin Panel</p>
            </div>
          </div>
        </div>
        
        <nav className="p-4 flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-[#1152d4] text-white'
                  : 'text-[#616f89] hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="pb-20 lg:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation - Hide on order detail pages */}
      {!pathname.includes('/admin/orders/') || pathname === '/admin/orders' ? (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a202c] border-t border-gray-100 dark:border-gray-800 px-4 py-2 lg:hidden z-40">
          <div className="flex items-center justify-around">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'text-[#1152d4]'
                    : 'text-[#616f89]'
                }`}
              >
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}

// Main export with AuthProvider and ThemeProvider wrapper
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </ThemeProvider>
    </AuthProvider>
  );
}
