'use client';

// ============================================
// ADMIN FORGOT PASSWORD PAGE
// ============================================
// Public page - allows admin to request password reset

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
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
          onClick={() => router.back()}
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
            {/* Success Header */}
            <div className="mb-4">
              <h2 className="text-[#111318] tracking-tight text-[32px] font-bold leading-tight text-center">
                Email Terkirim!
              </h2>
            </div>
            
            {/* Success Message */}
            <div className="mb-10">
              <p className="text-[#616f89] text-base font-normal leading-relaxed text-center px-2">
                Jika email terdaftar, link reset password telah dikirim. Periksa inbox atau folder spam Anda.
              </p>
            </div>

            {/* Back to Login Button */}
            <Link
              href="/admin/login"
              className="w-full bg-[#1152d4] hover:bg-[#1152d4]/90 text-white font-bold py-4 rounded-xl text-base transition-colors duration-200 shadow-lg shadow-[#1152d4]/20 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Kembali ke Login</span>
            </Link>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="mb-4">
              <h2 className="text-[#111318] tracking-tight text-[32px] font-bold leading-tight text-center">
                Lupa Kata Sandi?
              </h2>
            </div>

            {/* Description */}
            <div className="mb-10">
              <p className="text-[#616f89] text-base font-normal leading-relaxed text-center px-2">
                Masukkan email terdaftar Anda untuk menerima verifikasi pengaturan ulang kata sandi.
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

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[#111318] text-sm font-semibold ml-1">
                  Email Admin
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#616f89]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/20 border-2 border-gray-300 bg-white focus:border-[#1152d4] h-14 placeholder:text-gray-400 pl-12 pr-4 text-base font-normal transition-all duration-200 shadow-sm autofill-fix"
                    placeholder="admin@cleaningservice.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#1152d4] hover:bg-[#1152d4]/90 disabled:bg-[#1152d4]/50 text-white font-bold py-4 rounded-xl text-base transition-colors duration-200 shadow-lg shadow-[#1152d4]/20 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Verifikasi</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
