'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDateGMT7 } from '@/lib/utils';
import type { DiscoverySource } from '@/types';

function BarChart({ data }: { data: Array<{ day: string; amount: number }> }) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
        
        return (
          <div key={item.day} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{item.day}</span>
            <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{
                  width: `${Math.max(percentage, 3)}%`,
                  backgroundColor: `rgba(17, 82, 212, 0.7)`
                }}
              ></div>
            </div>
            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 w-20 text-right">
              {formatCurrency(item.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type DiscoverySourceDatum = {
  source: DiscoverySource;
  label: string;
  count: number;
  percentage: number;
};

type DiscoverySourceSummary = {
  totalCustomers: number;
  answeredCustomers: number;
  unansweredCustomers: number;
};

type TrendDatum = {
  day: string;
  amount: number;
  date: string;
};

type WeeklyData = {
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  weekData: TrendDatum[];
};

type MonthlyIncomeDatum = {
  month: number;
  monthName: string;
  amount: number;
};

type YearlyData = {
  year: number;
  monthlyIncome: MonthlyIncomeDatum[];
};

type OverviewCache = {
  trendData: TrendDatum[];
  discoverySourceData: DiscoverySourceDatum[];
  discoverySourceSummary: DiscoverySourceSummary;
};

type WeeklyBootstrapCache = {
  availableWeeks: number[];
  selectedWeek: number | null;
  weeklyData: WeeklyData | null;
};

type YearlyBootstrapCache = {
  availableYears: number[];
  selectedYear: number | null;
  yearlyData: YearlyData | null;
};

const REPORT_CACHE_VERSION = 'v1';
const OVERVIEW_CACHE_KEY = `report:${REPORT_CACHE_VERSION}:overview`;
const weeklyBootstrapCacheKey = (year: number) =>
  `report:${REPORT_CACHE_VERSION}:weekly:${year}:bootstrap`;
const weeklyDataCacheKey = (year: number, week: number) =>
  `report:${REPORT_CACHE_VERSION}:weekly:${year}:${week}`;
const YEARLY_BOOTSTRAP_CACHE_KEY = `report:${REPORT_CACHE_VERSION}:yearly:bootstrap`;
const yearlyDataCacheKey = (year: number) =>
  `report:${REPORT_CACHE_VERSION}:yearly:${year}`;

const EMPTY_DISCOVERY_SUMMARY: DiscoverySourceSummary = {
  totalCustomers: 0,
  answeredCustomers: 0,
  unansweredCustomers: 0,
};

function readSessionCache<T>(key: string): T | null {
  try {
    const cachedValue = sessionStorage.getItem(key);
    return cachedValue ? JSON.parse(cachedValue) as T : null;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The report still works when browser storage is unavailable or full.
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function DiscoverySourceChart({ data }: { data: DiscoverySourceDatum[] }) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const barWidth = (item.count / maxCount) * 100;

        return (
          <div key={item.source}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-[#111318] dark:text-gray-200">
                {item.label}
              </span>
              <span className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                <span className="font-bold text-[#111318] dark:text-white">{item.count}</span>
                {' customer · '}{item.percentage}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-[#1152d4] transition-all duration-300"
                style={{ width: item.count > 0 ? `${Math.max(barWidth, 2)}%` : '0%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportPage() {
  useAuth();
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const selectedYear = new Date().getFullYear();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  const [trendData, setTrendData] = useState<TrendDatum[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [discoverySourceData, setDiscoverySourceData] = useState<DiscoverySourceDatum[]>([]);
  const [discoverySourceSummary, setDiscoverySourceSummary] =
    useState<DiscoverySourceSummary>(EMPTY_DISCOVERY_SUMMARY);

  const [selectedYearForYearly, setSelectedYearForYearly] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData | null>(null);
  const [yearlyLoading, setYearlyLoading] = useState(true);
  const weeklyRequestId = useRef(0);
  const yearlyRequestId = useRef(0);

  useEffect(() => {
    const unlocked = sessionStorage.getItem('reportUnlocked') === 'true';
    setIsLocked(!unlocked);
  }, []);

  useEffect(() => {
    if (isLocked) return;

    const controller = new AbortController();
    const { signal } = controller;

    const loadOverview = async () => {
      const cachedOverview = readSessionCache<OverviewCache>(OVERVIEW_CACHE_KEY);
      if (cachedOverview) {
        setTrendData(cachedOverview.trendData);
        setDiscoverySourceData(cachedOverview.discoverySourceData);
        setDiscoverySourceSummary(cachedOverview.discoverySourceSummary);
        setTrendLoading(false);
      } else {
        setTrendLoading(true);
      }

      try {
        const response = await fetch('/api/dashboard?type=report', { signal });
        const result = await response.json();
        if (!result.success || !result.data?.incomeTrend || signal.aborted) return;

        const overview: OverviewCache = {
          trendData: result.data.incomeTrend,
          discoverySourceData: result.data.discoverySourceDistribution || [],
          discoverySourceSummary:
            result.data.discoverySourceSummary || EMPTY_DISCOVERY_SUMMARY,
        };

        setTrendData(overview.trendData);
        setDiscoverySourceData(overview.discoverySourceData);
        setDiscoverySourceSummary(overview.discoverySourceSummary);
        writeSessionCache(OVERVIEW_CACHE_KEY, overview);
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error('Failed to fetch report overview:', requestError);
        }
      } finally {
        if (!signal.aborted) setTrendLoading(false);
      }
    };

    const loadWeeklyBootstrap = async () => {
      const requestId = ++weeklyRequestId.current;
      const cacheKey = weeklyBootstrapCacheKey(selectedYear);
      const cachedWeekly = readSessionCache<WeeklyBootstrapCache>(cacheKey);

      if (cachedWeekly) {
        setAvailableWeeks(cachedWeekly.availableWeeks);
        setSelectedWeek(cachedWeekly.selectedWeek);
        setWeeklyData(cachedWeekly.weeklyData);
        setWeeklyLoading(false);
      } else {
        setWeeklyLoading(true);
      }

      try {
        const params = new URLSearchParams({
          action: 'available',
          year: selectedYear.toString(),
          includeData: 'true',
        });
        const response = await fetch(`/api/income/weekly?${params}`, { signal });
        const result = await response.json();
        if (!result.success || signal.aborted || requestId !== weeklyRequestId.current) return;

        const weeklyBootstrap: WeeklyBootstrapCache = {
          availableWeeks: result.data.availableWeeks || [],
          selectedWeek: result.data.selectedWeek ?? null,
          weeklyData: result.data.selectedWeekData ?? null,
        };

        setAvailableWeeks(weeklyBootstrap.availableWeeks);
        setSelectedWeek(weeklyBootstrap.selectedWeek);
        setWeeklyData(weeklyBootstrap.weeklyData);
        writeSessionCache(cacheKey, weeklyBootstrap);

        if (weeklyBootstrap.selectedWeek !== null && weeklyBootstrap.weeklyData) {
          writeSessionCache(
            weeklyDataCacheKey(selectedYear, weeklyBootstrap.selectedWeek),
            weeklyBootstrap.weeklyData
          );
        }
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error('Failed to fetch weekly report:', requestError);
        }
      } finally {
        if (!signal.aborted && requestId === weeklyRequestId.current) {
          setWeeklyLoading(false);
        }
      }
    };

    const loadYearlyBootstrap = async () => {
      const requestId = ++yearlyRequestId.current;
      const cachedYearly = readSessionCache<YearlyBootstrapCache>(
        YEARLY_BOOTSTRAP_CACHE_KEY
      );

      if (cachedYearly) {
        setAvailableYears(cachedYearly.availableYears);
        setSelectedYearForYearly(cachedYearly.selectedYear);
        setYearlyData(cachedYearly.yearlyData);
        setYearlyLoading(false);
      } else {
        setYearlyLoading(true);
      }

      try {
        const response = await fetch('/api/income/monthly', { signal });
        const result = await response.json();
        if (!result.success || signal.aborted || requestId !== yearlyRequestId.current) return;

        const selectedYearData = result.data.selectedYearData as YearlyData | null;
        const yearlyBootstrap: YearlyBootstrapCache = {
          availableYears: result.data.availableYears || [],
          selectedYear: selectedYearData?.year ?? null,
          yearlyData: selectedYearData,
        };

        setAvailableYears(yearlyBootstrap.availableYears);
        setSelectedYearForYearly(yearlyBootstrap.selectedYear);
        setYearlyData(yearlyBootstrap.yearlyData);
        writeSessionCache(YEARLY_BOOTSTRAP_CACHE_KEY, yearlyBootstrap);

        if (selectedYearData) {
          writeSessionCache(yearlyDataCacheKey(selectedYearData.year), selectedYearData);
        }
      } catch (requestError) {
        if (!isAbortError(requestError)) {
          console.error('Failed to fetch yearly report:', requestError);
        }
      } finally {
        if (!signal.aborted && requestId === yearlyRequestId.current) {
          setYearlyLoading(false);
        }
      }
    };

    void Promise.allSettled([
      loadOverview(),
      loadWeeklyBootstrap(),
      loadYearlyBootstrap(),
    ]);

    return () => controller.abort();
  }, [isLocked, selectedYear]);

  const handleWeekChange = async (week: number) => {
    const requestId = ++weeklyRequestId.current;
    setSelectedWeek(week);

    const cacheKey = weeklyDataCacheKey(selectedYear, week);
    const cachedWeeklyData = readSessionCache<WeeklyData>(cacheKey);
    if (cachedWeeklyData) {
      setWeeklyData(cachedWeeklyData);
      setWeeklyLoading(false);
    } else {
      setWeeklyData(null);
      setWeeklyLoading(true);
    }

    try {
      const params = new URLSearchParams({
        week: week.toString(),
        year: selectedYear.toString(),
      });
      const response = await fetch(`/api/income/weekly?${params}`);
      const result = await response.json();
      if (!result.success || requestId !== weeklyRequestId.current) return;

      const nextWeeklyData = result.data as WeeklyData;
      setWeeklyData(nextWeeklyData);
      writeSessionCache(cacheKey, nextWeeklyData);
    } catch (requestError) {
      console.error('Failed to fetch weekly report:', requestError);
    } finally {
      if (requestId === weeklyRequestId.current) setWeeklyLoading(false);
    }
  };

  const handlePrevWeek = () => {
    if (selectedWeek !== null && availableWeeks.length > 0) {
      const currentIndex = availableWeeks.indexOf(selectedWeek);
      if (currentIndex > 0) {
        void handleWeekChange(availableWeeks[currentIndex - 1]);
      }
    }
  };

  const handleNextWeek = () => {
    if (selectedWeek !== null && availableWeeks.length > 0) {
      const currentIndex = availableWeeks.indexOf(selectedWeek);
      if (currentIndex < availableWeeks.length - 1) {
        void handleWeekChange(availableWeeks[currentIndex + 1]);
      }
    }
  };

  const handleYearChange = async (year: number) => {
    const requestId = ++yearlyRequestId.current;
    setSelectedYearForYearly(year);

    const cacheKey = yearlyDataCacheKey(year);
    const cachedYearlyData = readSessionCache<YearlyData>(cacheKey);
    if (cachedYearlyData) {
      setYearlyData(cachedYearlyData);
      setYearlyLoading(false);
    } else {
      setYearlyData(null);
      setYearlyLoading(true);
    }

    try {
      const params = new URLSearchParams({ year: year.toString() });
      const response = await fetch(`/api/income/monthly?${params}`);
      const result = await response.json();
      if (!result.success || requestId !== yearlyRequestId.current) return;

      const nextYearlyData = result.data.selectedYearData as YearlyData | null;
      setAvailableYears(result.data.availableYears || []);
      setYearlyData(nextYearlyData);
      if (nextYearlyData) writeSessionCache(cacheKey, nextYearlyData);
    } catch (requestError) {
      console.error('Failed to fetch yearly report:', requestError);
    } finally {
      if (requestId === yearlyRequestId.current) setYearlyLoading(false);
    }
  };

  const handlePrevYear = () => {
    if (selectedYearForYearly !== null && availableYears.length > 0) {
      const currentIndex = availableYears.indexOf(selectedYearForYearly);
      if (currentIndex > 0) {
        void handleYearChange(availableYears[currentIndex - 1]);
      }
    }
  };

  const handleNextYear = () => {
    if (selectedYearForYearly !== null && availableYears.length > 0) {
      const currentIndex = availableYears.indexOf(selectedYearForYearly);
      if (currentIndex < availableYears.length - 1) {
        void handleYearChange(availableYears[currentIndex + 1]);
      }
    }
  };

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

        <section className="px-4 mt-6 flex flex-col gap-4">
          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#111318] dark:text-white text-base font-bold">Trend 7 Hari</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Pendapatan 7 hari terakhir</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">show_chart</span>
            </div>
            {trendLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
              </div>
            ) : (
              <BarChart data={trendData} />
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[#111318] dark:text-white text-base font-bold">Customer Tahu dari Mana</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  Sumber informasi customer unik sepanjang waktu
                </p>
              </div>
              <span className="material-symbols-outlined text-gray-400">campaign</span>
            </div>
            {trendLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
              </div>
            ) : discoverySourceSummary.answeredCustomers > 0 ? (
              <>
                <DiscoverySourceChart data={discoverySourceData} />
                <div className="mt-6 rounded-xl bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                    {discoverySourceSummary.answeredCustomers} dari {discoverySourceSummary.totalCustomers} customer mengisi sumber informasi
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-blue-700 dark:text-blue-300">
                    Persentase dihitung dari customer yang menjawab. Total dapat melebihi 100% karena customer bisa memilih lebih dari satu sumber.
                  </p>
                  {discoverySourceSummary.unansweredCustomers > 0 && (
                    <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
                      {discoverySourceSummary.unansweredCustomers} customer belum mengisi.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3">
                  campaign
                </span>
                <p className="text-[#111318] dark:text-white text-base font-bold mb-1">Belum Ada Data Sumber Customer</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Data akan muncul setelah customer mengisi “Tahu dari mana?”
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            {weeklyLoading && availableWeeks.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
              </div>
            ) : availableWeeks.length > 0 ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[#111318] dark:text-white text-base font-bold">Pendapatan Mingguan</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      Minggu ke-{selectedWeek || '...'} — {weeklyData && formatDateGMT7(new Date(weeklyData.startDate))} s/d {weeklyData && formatDateGMT7(new Date(weeklyData.endDate))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevWeek}
                      disabled={weeklyLoading || selectedWeek === availableWeeks[0]}
                      className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ←
                    </button>
                    <select
                      value={selectedWeek || ''}
                      onChange={(e) => handleWeekChange(parseInt(e.target.value))}
                      disabled={weeklyLoading}
                      className="text-xs rounded bg-white dark:bg-[#0f1724] border border-gray-200 dark:border-gray-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50"
                    >
                      {availableWeeks.map((week) => (
                        <option key={week} value={week}>
                          Minggu {week}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleNextWeek}
                      disabled={weeklyLoading || selectedWeek === availableWeeks[availableWeeks.length - 1]}
                      className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
                {weeklyLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
                  </div>
                ) : (
                  <BarChart data={weeklyData?.weekData || []} />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3">
                  monitoring
                </span>
                <p className="text-[#111318] dark:text-white text-base font-bold mb-1">Belum Ada Data Pendapatan</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Data akan muncul setelah ada pesanan yang diselesaikan
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            {yearlyLoading && availableYears.length === 0 ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
              </div>
            ) : availableYears.length > 0 ? (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[#111318] dark:text-white text-base font-bold">Pendapatan Tahunan</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      {selectedYearForYearly || '...'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevYear}
                      disabled={yearlyLoading || selectedYearForYearly === availableYears[0]}
                      className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ←
                    </button>
                    <select
                      value={selectedYearForYearly || ''}
                      onChange={(e) => handleYearChange(parseInt(e.target.value))}
                      disabled={yearlyLoading}
                      className="text-xs rounded bg-white dark:bg-[#0f1724] border border-gray-200 dark:border-gray-700 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleNextYear}
                      disabled={yearlyLoading || selectedYearForYearly === availableYears[availableYears.length - 1]}
                      className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      →
                    </button>
                  </div>
                </div>
                {yearlyLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1152d4]"></div>
                  </div>
                ) : (
                  yearlyData && yearlyData.monthlyIncome && yearlyData.monthlyIncome.length > 0 ? (
                    <BarChart data={yearlyData.monthlyIncome.map((monthItem: { month: number; monthName: string; amount: number }) => ({ day: monthItem.monthName, amount: monthItem.amount }))} />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <p className="text-[#111318] dark:text-white text-base font-bold mb-1">Belum Ada Data Tahunan</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Data akan muncul setelah ada pesanan yang diselesaikan
                      </p>
                    </div>
                  )
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3">
                  calendar_month
                </span>
                <p className="text-[#111318] dark:text-white text-base font-bold mb-1">Belum Ada Data Tahunan</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  Data akan muncul setelah ada pesanan yang diselesaikan
                </p>
              </div>
            )}
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
                        placeholder="••••••"
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
