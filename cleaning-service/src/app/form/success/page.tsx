'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SuccessPage() {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] min-h-screen flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-[#1a2230]/95 backdrop-blur-md border-b border-[#dbdfe6] dark:border-[#2a3441] px-4 py-3 flex items-center justify-center">
        <h1 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight">
          Konfirmasi
        </h1>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        {/* Success Animation */}
        <div className="relative mb-8">
          {/* Confetti effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`
                  }}
                >
                  <span className="text-2xl">
                    {['🎉', '✨', '🎊', '⭐'][i % 4]}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {/* Success icon */}
          <div className="relative w-32 h-32 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-6xl">
              check_circle
            </span>
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-[#111318] dark:text-white text-2xl font-bold mb-3">
          Data Berhasil Dikirim!
        </h2>
        <p className="text-[#616f89] dark:text-gray-400 text-base mb-2">
          Terima kasih telah menggunakan layanan kami.
        </p>
        <p className="text-[#616f89] dark:text-gray-400 text-sm mb-8 max-w-xs">
          Tim kami akan menghubungi Anda melalui kontak yang diberikan untuk konfirmasi lebih lanjut.
        </p>

        {/* Info Card */}
        <div className="w-full bg-white dark:bg-[#1a2230] rounded-2xl p-6 shadow-sm border border-[#dbdfe6] dark:border-[#2a3441] mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1152d4]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#1152d4] text-2xl">
                schedule
              </span>
            </div>
            <div className="text-left">
              <h3 className="text-[#111318] dark:text-white font-semibold mb-1">
                Proses Selanjutnya
              </h3>
              <ul className="text-sm text-[#616f89] dark:text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">1.</span>
                  Pesanan Anda telah dikonfirmasi
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">2.</span>
                  Kami akan menghubungi melalui kontak yang diberikan
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">3.</span>
                  Penjemputan dijadwalkan
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link
          href="/form"
          className="w-full h-14 bg-[#1152d4] hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#1152d4]/25 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Buat Pesanan Baru</span>
        </Link>

        {/* Secondary Action */}
        <p className="mt-6 text-sm text-[#616f89] dark:text-gray-400">
          Ada pertanyaan?{' '}
          <a
            href="https://wa.me/6281234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1152d4] hover:underline font-medium"
          >
            Hubungi kami via WhatsApp
          </a>
        </p>
      </main>
    </div>
  );
}
