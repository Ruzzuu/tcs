'use client';

// ============================================
// ADMIN RESET PASSWORD PAGE
// ============================================
// Public page - allows admin to set new password with token

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Token tidak valid. Gunakan link dari email Anda.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError('Terjadi kesalahan. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col relative">
      {/* Background Decoration */}
      <div className="fixed -z-10 bottom-0 left-0 w-full opacity-5 pointer-events-none overflow-hidden">
        <div className="w-[500px] h-[500px] bg-[#1152d4] rounded-full blur-[100px] -mb-64 -ml-32"></div>
      </div>

      {/* Top Navigation */}
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between">
        <button 
          onClick={() => router.push('/admin/login')}
          className="text-[#111318] flex w-12 h-12 shrink-0 items-center justify-center cursor-pointer hover:bg-gray-100 rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-6 pt-4 pb-12 max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="flex justify-center mb-10 pt-4">
          <div className="w-20 h-20 bg-[#1152d4]/10 rounded-2xl flex items-center justify-center">
            <img 
              src="https://res.cloudinary.com/dncpyspjq/image/upload/f_auto,q_auto,w_200/v1768543427/logo_tcs_keooto.png" 
              alt="Teman Cuci Sepatu" 
              className="w-12 h-12 object-contain"
            />
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <>
            <div className="mb-4">
              <h2 className="text-[#111318] tracking-tight text-[32px] font-bold leading-tight text-center">
                Password Berhasil Direset!
              </h2>
            </div>
            
            <div className="mb-10">
              <p className="text-[#616f89] text-base font-normal leading-relaxed text-center px-2">
                Password Anda telah berhasil diubah. Silakan login dengan password baru Anda.
              </p>
            </div>

            <Link
              href="/admin/login"
              className="w-full bg-[#1152d4] hover:bg-[#1152d4]/90 text-white font-bold py-4 rounded-xl text-base transition-colors duration-200 shadow-lg shadow-[#1152d4]/20 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Login Sekarang</span>
            </Link>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-[#111318] tracking-tight text-[32px] font-bold leading-tight text-center">
                Reset Password
              </h2>
            </div>

            {/* Description */}
            <div className="mb-10">
              <p className="text-[#616f89] text-base font-normal leading-relaxed text-center px-2">
                Masukkan password baru Anda. Password minimal 8 karakter.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* New Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#111318] text-sm font-semibold ml-1">
                  Password Baru
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#616f89]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/20 border-2 border-gray-300 bg-white focus:border-[#1152d4] h-14 placeholder:text-gray-400 pl-12 pr-12 text-base font-normal transition-all duration-200 shadow-sm autofill-fix"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={!token}
                    autoComplete="new-password"
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
              </div>

              {/* Confirm Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#111318] text-sm font-semibold ml-1">
                  Konfirmasi Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#616f89]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/20 border-2 border-gray-300 bg-white focus:border-[#1152d4] h-14 placeholder:text-gray-400 pl-12 pr-4 text-base font-normal transition-all duration-200 shadow-sm autofill-fix"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    disabled={!token}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full bg-[#1152d4] hover:bg-[#1152d4]/90 disabled:bg-[#1152d4]/50 text-white font-bold py-4 rounded-xl text-base transition-colors duration-200 shadow-lg shadow-[#1152d4]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Reset Password</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Footer Link */}
        {!success && (
          <div className="mt-auto pt-8">
            <Link
              href="/admin/login"
              className="flex items-center justify-center gap-2 text-[#1152d4] font-semibold text-base hover:opacity-80 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Kembali ke Login</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
