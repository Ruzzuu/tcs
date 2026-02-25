'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportPage() {
  const { } = useAuth();
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unlocked = sessionStorage.getItem('reportUnlocked') === 'true';
    setIsLocked(!unlocked);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('reportUnlocked', 'true');
        setIsLocked(false);
        setPassword('');
        setError('');
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Failed to verify password. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLeave = () => {
    sessionStorage.removeItem('reportUnlocked');
    setIsLocked(true);
    setPassword('');
    setError('');
  };

  return (
    <div className="relative min-h-screen">
      <div className={isLocked ? "filter blur-[6px] opacity-30 dark:opacity-20 select-none pointer-events-none" : ""}>
        <section className="px-4 pt-6 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-[#111318] dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em]">
              Report
            </h1>
            <p className="text-[#616f89] dark:text-gray-400 text-sm mt-1">
              Laporan dan analisis data
            </p>
          </div>
          {!isLocked && (
            <button
              onClick={handleLeave}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">exit_to_app</span>
              <span>Leave</span>
            </button>
          )}
        </section>

        <section className="px-4 mt-6">
          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">
                assessment
              </span>
              <h2 className="text-[#111318] dark:text-white text-lg font-semibold">
                Halaman Report
              </h2>
              <p className="text-[#616f89] dark:text-gray-400 text-sm max-w-sm">
                Halaman ini masih dalam pengembangan. Fitur laporan akan segera tersedia.
              </p>
            </div>
          </div>
        </section>
      </div>

      {isLocked && (
        <>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md z-10"></div>
          <div className="fixed inset-0 z-20 flex items-center justify-center px-4">
            <div className="w-full max-w-[340px]">
              <div className="w-full bg-white dark:bg-[#1a202c] rounded-[32px] shadow-2xl p-8 border border-white/10 overflow-hidden">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-16 h-16 bg-[#1152d4]/10 rounded-full flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[#1152d4] text-[48px]">lock</span>
                  </div>
                  <h2 className="text-2xl font-bold text-[#111318] dark:text-white">Password Entry</h2>
                  <p className="text-[#616f89] dark:text-gray-400 text-sm mt-2 text-center px-2">
                    This report is protected. Please enter your admin password.
                  </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-[#616f89] dark:text-gray-500 uppercase tracking-[0.1em] mb-2 ml-1">
                      Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#616f89] dark:text-gray-500 text-xl">key</span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-4 bg-[#f6f6f8] dark:bg-[#101622] border-none ring-1 ring-[#dbdfe6] dark:ring-[#2a3441] focus:ring-2 focus:ring-[#1152d4] rounded-2xl text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 transition-all text-lg focus:outline-none"
                        placeholder="•••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] dark:text-gray-500"
                      >
                        <span className="material-symbols-outlined text-xl">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-4 bg-[#1152d4] hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-[#1152d4]/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      'Enter'
                    )}
                  </button>
                </form>
                <div className="mt-8 text-center">
                  <p className="text-[11px] font-medium text-[#616f89] dark:text-gray-500 uppercase tracking-widest">
                    Secure Access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
