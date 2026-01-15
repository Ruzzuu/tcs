'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Order, OrderStatus } from '@/types';
import { formatCurrency, formatRelativeTime, getInitials, getAvatarColor, getStatusColor, getStatusLabel } from '@/lib/utils';
import { SERVICES } from '@/lib/services';
import { ServiceType } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        verified: 'true',
        page: page.toString(),
        limit: '20'
      });
      
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      if (dateFilter) {
        params.set('startDate', dateFilter);
        params.set('endDate', dateFilter);
      }

      const response = await fetch(`/api/orders?${params}`);
      const result = await response.json();

      if (result.success) {
        setOrders(result.data.orders);
        setTotalPages(result.data.totalPages);
      } else {
        setError(result.error || 'Failed to load orders');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, dateFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchOrders();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(debounce);
  }, [fetchOrders, searchQuery]);

  const handleDelete = async (orderId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Apakah Anda yakin ingin menghapus pesanan ini?')) return;
    
    setDeletingId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        setOrders(prev => prev.filter(o => o._id !== orderId));
      } else {
        alert(result.error || 'Gagal menghapus pesanan');
      }
    } catch {
      alert('Gagal terhubung ke server');
    } finally {
      setDeletingId(null);
    }
  };

  const statusOptions: Array<{ value: OrderStatus | 'all'; label: string; icon: string }> = [
    { value: 'all', label: 'Semua', icon: 'list_alt' },
    { value: 'pending', label: 'Menunggu', icon: 'pending_actions' },
    { value: 'in_progress', label: 'Proses', icon: 'autorenew' },
    { value: 'delivered', label: 'Diantar', icon: 'local_shipping' },
    { value: 'picked_up', label: 'Diambil', icon: 'inventory' },
    { value: 'finished', label: 'Selesai', icon: 'check_circle' }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#111318] dark:text-white">Daftar Pesanan</h1>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative group flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#1152d4] transition-colors text-[20px]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-3 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#1a202c] text-sm text-[#111318] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1152d4] outline-none shadow-sm transition-all"
            placeholder="Cari nama, telepon, atau nomor order..."
          />
        </div>
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            className="h-full px-3 py-2 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#1a202c] text-sm text-[#111318] dark:text-white focus:ring-2 focus:ring-[#1152d4] outline-none shadow-sm transition-all cursor-pointer"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
        {statusOptions.map(option => (
          <button
            key={option.value}
            onClick={() => {
              setStatusFilter(option.value);
              setPage(1);
            }}
            className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4 transition-all ${
              statusFilter === option.value
                ? 'bg-[#1152d4] text-white shadow-md'
                : 'bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && orders.length === 0 && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={fetchOrders}
            className="mt-4 px-4 py-2 bg-[#1152d4] text-white rounded-lg hover:bg-blue-700"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">inbox</span>
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Tidak Ada Pesanan</h3>
          <p className="text-sm text-gray-500">
            {searchQuery ? 'Tidak ada hasil untuk pencarian ini.' : 'Belum ada pesanan yang sesuai filter.'}
          </p>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {orders.map(order => {
          const statusColor = getStatusColor(order.status);
          const avatarColor = getAvatarColor(order.name);
          const serviceName = SERVICES[order.itemType as ServiceType]?.name || order.itemType;

          return (
            <div
              key={order._id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a202c] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <Link
                href={`/admin/orders/${order._id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className={`${avatarColor} rounded-full h-12 w-12 flex items-center justify-center font-bold text-sm shrink-0`}>
                  {getInitials(order.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#111318] dark:text-white truncate">{order.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor.bg} ${statusColor.text}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {serviceName} • Qty: {order.quantity}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    #{order.orderNumber} • {formatRelativeTime(order.createdAt)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#111318] dark:text-white">
                    {formatCurrency(order.finalPrice || order.estimatedPrice)}
                  </p>
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                </div>
              </Link>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(order._id, e)}
                disabled={deletingId === order._id}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0 disabled:opacity-50"
                title="Hapus pesanan"
              >
                {deletingId === order._id ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                )}
              </button>

              <Link href={`/admin/orders/${order._id}`}>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
      )}
    </div>
  );
}
