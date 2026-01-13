'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { DashboardData, Order } from '@/types';
import { formatCurrency, formatDate, formatRelativeTime, getInitials, getAvatarColor, getStatusColor, getStatusLabel, generateWhatsAppLink, WA_TEMPLATES } from '@/lib/utils';
import { SERVICES } from '@/lib/services';
import { ServiceType } from '@/types';

// Simple Pie Chart Component (CSS-based, matching original design)
function PieChart({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex flex-row items-center justify-center gap-8">
        <div className="relative w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <span className="text-xs text-gray-400">No data</span>
        </div>
      </div>
    );
  }

  // Calculate percentages and create conic gradient
  let cumulative = 0;
  const gradientStops = data.map(item => {
    const start = cumulative;
    const percentage = (item.value / total) * 100;
    cumulative += percentage;
    return `${item.color} ${start}% ${cumulative}%`;
  }).join(', ');

  return (
    <div className="flex flex-row items-center justify-center gap-8">
      <div
        className="relative w-32 h-32 rounded-full shrink-0"
        style={{ background: `conic-gradient(${gradientStops})` }}
      >
        <div className="absolute inset-0 m-auto w-20 h-20 bg-white dark:bg-[#1a202c] rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-gray-500">{total}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {SERVICES[item.name as ServiceType]?.name || item.name} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar Chart Component (CSS-based, matching original design)
function BarChart({ data }: { data: Array<{ day: string; amount: number }> }) {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="grid grid-flow-col gap-2 grid-rows-[1fr_auto] items-end justify-items-center h-40 pt-4">
      {data.map((item, index) => {
        const height = (item.amount / maxAmount) * 100;
        const opacity = 0.2 + (index / data.length) * 0.8;
        
        return (
          <div key={item.day} className="contents">
            <div
              className="w-full rounded-t-sm transition-all duration-300"
              style={{
                height: `${Math.max(height, 5)}%`,
                backgroundColor: `rgba(17, 82, 212, ${opacity})`
              }}
              title={formatCurrency(item.amount)}
            ></div>
            <p className="text-gray-400 text-[10px] font-bold mt-2">{item.day}</p>
          </div>
        );
      })}
    </div>
  );
}

// Order Card Component
function OrderCard({ order }: { order: Order }) {
  const statusColor = getStatusColor(order.status);
  const avatarColor = getAvatarColor(order.name);
  const serviceName = SERVICES[order.itemType as ServiceType]?.name || order.itemType;

  return (
    <div className="flex flex-col p-4 bg-white dark:bg-[#1a202c] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm gap-3">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`${avatarColor} rounded-full h-10 w-10 flex items-center justify-center font-bold text-sm`}>
            {getInitials(order.name)}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111318] dark:text-white">{order.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">{serviceName}</span>
              <span className="text-xs text-gray-300">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Qty: {order.quantity}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#111318] dark:text-white">
            {formatCurrency(order.finalPrice || order.estimatedPrice)}
          </p>
          <div className="flex flex-col items-end">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-300">{formatDate(order.createdAt)}</p>
            <p className="text-[10px] text-gray-400">{formatRelativeTime(order.createdAt)}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-1 pt-3 border-t border-gray-50 dark:border-gray-800">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
          {getStatusLabel(order.status)}
        </span>
        <div className="flex items-center gap-2">
          <a
            href={generateWhatsAppLink(order.phone, WA_TEMPLATES.orderInProgress(order))}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
          >
            <span className="text-xs font-bold">WhatsApp</span>
            <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
          </a>
          <Link
            href={`/admin/orders/${order._id}`}
            className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      <section className="px-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          ))}
        </div>
      </section>
      <section className="px-4 mt-6">
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter recent orders by search
  const filteredOrders = data?.recentOrders.filter(order =>
    order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.phone.includes(searchQuery) ||
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (SERVICES[order.itemType as ServiceType]?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.customItemType || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-2 bg-[#1152d4] text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* KPI Cards */}
      <section className="px-4 pt-6">
        <div className="grid grid-cols-2 gap-3">
          {/* Total Orders - Full Width */}
          <div className="col-span-2 flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-[#1a202c] shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <span className="material-symbols-outlined text-[18px]">list_alt</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Total Orders</p>
            </div>
            <p className="text-[#111318] dark:text-white text-2xl font-bold leading-tight mt-1">
              {data?.total.toLocaleString() || 0}
            </p>
          </div>

          {/* Pending */}
          <Link href="/admin/pending" className="flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-[#1a202c] shadow-sm border-l-4 border-l-amber-400 border-y border-r border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <span className="material-symbols-outlined text-[18px]">pending_actions</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Verifikasi</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[#111318] dark:text-white text-2xl font-bold leading-tight">
                {data?.unverified || 0}
              </p>
              {(data?.unverified || 0) > 0 && (
                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                  NEW
                </span>
              )}
            </div>
          </Link>

          {/* In Progress */}
          <div className="flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-[#1a202c] shadow-sm border-l-4 border-l-[#1152d4] border-y border-r border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1152d4]/10 text-[#1152d4]">
                <span className="material-symbols-outlined text-[18px]">autorenew</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Proses</p>
            </div>
            <p className="text-[#111318] dark:text-white text-2xl font-bold leading-tight mt-1">
              {data?.inProgress || 0}
            </p>
          </div>

          {/* Out (Delivered) */}
          <div className="flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-[#1a202c] shadow-sm border-l-4 border-l-purple-500 border-y border-r border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Diantar</p>
            </div>
            <p className="text-[#111318] dark:text-white text-2xl font-bold leading-tight mt-1">
              {data?.delivered || 0}
            </p>
          </div>

          {/* Finished */}
          <div className="flex flex-col gap-2 rounded-xl p-4 bg-white dark:bg-[#1a202c] shadow-sm border-l-4 border-l-emerald-500 border-y border-r border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider">Selesai</p>
            </div>
            <p className="text-[#111318] dark:text-white text-2xl font-bold leading-tight mt-1">
              {data?.finished.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="px-4">
        <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">Analitik</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Service Distribution Pie Chart */}
          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#111318] dark:text-white text-base font-bold">Layanan</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Distribusi jenis barang</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">pie_chart</span>
            </div>
            <PieChart data={data?.serviceDistribution || []} />
          </div>

          {/* Income Trend Bar Chart */}
          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[#111318] dark:text-white text-base font-bold">Pendapatan</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">7 Hari Terakhir</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">bar_chart</span>
            </div>
            <BarChart data={data?.incomeTrend || []} />
          </div>
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Pesanan Terbaru</h2>
          <Link href="/admin/orders" className="text-[#1152d4] text-sm font-medium hover:underline">
            Lihat Semua
          </Link>
        </div>

        {/* Search Input */}
        <div className="relative mb-5 group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#1152d4] transition-colors text-[20px]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#1a202c] text-sm text-[#111318] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1152d4] outline-none shadow-sm transition-all"
            placeholder="Cari nama, telepon, atau nomor order..."
          />
        </div>

        {/* Orders List */}
        <div className="flex flex-col gap-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p>{searchQuery ? 'Tidak ada hasil' : 'Belum ada pesanan'}</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
