'use client';

export default function ReportPage() {
  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Page Header */}
      <section className="px-4 pt-6">
        <h1 className="text-[#111318] dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em]">
          Report
        </h1>
        <p className="text-[#616f89] dark:text-gray-400 text-sm mt-1">
          Laporan dan analisis data
        </p>
      </section>

      {/* Placeholder Content */}
      <section className="px-4">
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
  );
}
