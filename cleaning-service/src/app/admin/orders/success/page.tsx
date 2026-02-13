'use client';

import Link from 'next/link';

export default function OrderSuccessPage() {
  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] min-h-screen flex flex-col">
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
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
          Tim kami akan menghubungi Anda melalui WhatsApp untuk konfirmasi lebih lanjut.
        </p>

        {/* Next Steps Card */}
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
                  Admin akan memverifikasi data Anda
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">2.</span>
                  Kami akan menghubungi via WhatsApp
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">3.</span>
                  Penjemputan dijadwalkan
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* New Order Button */}
        <Link
          href="/admin/orders"
          className="w-full h-14 bg-[#1152d4] hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#1152d4]/25 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          <span>Buat Pesanan Baru</span>
        </Link>

        {/* Contact Link */}
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
