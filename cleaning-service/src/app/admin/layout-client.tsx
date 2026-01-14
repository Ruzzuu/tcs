'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/pending', label: 'Verifikasi', icon: 'pending_actions' },
    { href: '/admin/orders', label: 'Pesanan', icon: 'list_alt' },
  ];

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
            <div className="flex items-center justify-center size-8 rounded-full bg-[#1152d4]/10 text-[#1152d4]">
              <span className="material-symbols-outlined text-lg">local_laundry_service</span>
            </div>
            <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block">
              Cuci Premium
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
          <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-[#111318] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="h-8 w-8 rounded-full bg-[#1152d4]/20 flex items-center justify-center text-[#1152d4] font-bold text-xs border border-[#1152d4]/10">
            AD
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
            <div className="flex items-center justify-center size-10 rounded-full bg-[#1152d4]/10 text-[#1152d4]">
              <span className="material-symbols-outlined">local_laundry_service</span>
            </div>
            <div>
              <h2 className="text-[#111318] dark:text-white font-bold">Cuci Premium</h2>
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

      {/* Mobile Bottom Navigation */}
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
    </div>
  );
}
