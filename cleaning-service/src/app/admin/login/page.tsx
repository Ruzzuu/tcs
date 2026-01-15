'use client';

// ============================================
// ADMIN LOGIN PAGE
// ============================================
// Public page - allows admin to login

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState(''); // email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        // Wait for cookie to be properly set by browser before redirect
        setTimeout(() => {
          window.location.replace('/admin');
        }, 200);
        return;
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f8] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Logo and Header */}
        <div className="mb-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-[#1152d4] rounded-2xl flex items-center justify-center shadow-lg shadow-[#1152d4]/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.36 2.64a4.75 4.75 0 00-6.72 0L10 4.29 8.36 2.64a4.75 4.75 0 00-6.72 6.72L10 17.71l8.36-8.35a4.75 4.75 0 000-6.72zM12 20.71L3.64 12.36a4.75 4.75 0 010-6.72 4.75 4.75 0 016.72 0L12 7.29l1.64-1.65a4.75 4.75 0 016.72 6.72L12 20.71z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center text-[#111318]">
            Admin Portal
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Specialized Cleaning Services
          </p>
        </div>

        {/* Login Form Card */}
        <div className="w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Email/Username Field */}
            <div>
              <label className="block text-sm font-semibold mb-2 ml-1 text-gray-700">
                Email or Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#1152d4] focus:ring-2 focus:ring-[#1152d4]/20 transition-all px-4 text-base outline-none"
                  placeholder="admin@gmail.com"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold mb-2 ml-1 text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#1152d4] focus:ring-2 focus:ring-[#1152d4]/20 transition-all px-4 pr-12 text-base outline-none"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="mt-3 flex justify-end">
                <Link
                  href="/admin/forgot-password"
                  className="text-sm font-medium text-[#1152d4] hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-[#1152d4] hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center px-4">
          <div className="flex items-center justify-center gap-2 text-gray-400 mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-xs uppercase tracking-widest font-bold">Authorized Access Only</p>
          </div>
          <p className="text-sm text-gray-500">
            Contact your developer for an account.
          </p>
        </div>
      </div>
    </div>
  );
}
