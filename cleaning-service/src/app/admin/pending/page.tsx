'use client';

import { useEffect, useState, useCallback } from 'react';
import { Order } from '@/types';
import { formatCurrency, formatTime, getInitials, generateWhatsAppLink, WA_TEMPLATES } from '@/lib/utils';
import { SERVICES } from '@/lib/services';
import { ServiceType } from '@/types';

// Pending Card Component
function PendingCard({ 
  order, 
  onVerify 
}: { 
  order: Order; 
  onVerify: (orderId: string, action: 'approved' | 'rejected') => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const serviceName = SERVICES[order.itemType as ServiceType]?.name || order.itemType;

  const handleVerify = async (action: 'approved' | 'rejected') => {
    setIsProcessing(true);
    await onVerify(order._id, action);
    setIsProcessing(false);
  };

  return (
    <div className="bg-white dark:bg-[#1a2230] rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 dark:border-slate-800/60 flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
            {getInitials(order.name)}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{order.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              #{order.orderNumber} • <span className="text-orange-500 font-medium">Pending</span>
            </p>
          </div>
        </div>
        <div className="text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">
          {formatTime(order.createdAt)}
        </div>
      </div>

      {/* Details */}
      <div className="bg-slate-50 dark:bg-[#151b26] rounded-xl p-3 flex gap-3 items-center">
        <div className="w-16 h-16 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
          <span className="material-symbols-outlined text-3xl text-slate-400">
            {SERVICES[order.itemType as ServiceType]?.icon || 'inventory_2'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{serviceName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatCurrency(order.estimatedPrice)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Qty:</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">{order.quantity} Unit</span>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">call</span>
          <span>{order.phone}</span>
        </div>
        {order.address && (
          <div className="flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            <span className="truncate">{order.address}</span>
          </div>
        )}
      </div>

      {/* WhatsApp Action */}
      <a
        href={generateWhatsAppLink(order.phone, WA_TEMPLATES.newOrderVerification(order))}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-[#25D366]/10 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">chat</span>
        <span className="text-sm font-bold">Chat via WhatsApp</span>
        <span className="material-symbols-outlined text-[16px] opacity-70">open_in_new</span>
      </a>

      {/* Approve / Reject Actions */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/50">
        <button
          onClick={() => handleVerify('rejected')}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors group disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">close</span>
          Tolak
        </button>
        <button
          onClick={() => handleVerify('approved')}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <span className="material-symbols-outlined text-[20px]">check</span>
          )}
          Setujui
        </button>
      </div>
    </div>
  );
}

// Loading Skeleton
function PendingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
      ))}
    </div>
  );
}

export default function PendingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/orders/pending');
      const result = await response.json();

      if (result.success) {
        setOrders(result.data);
      } else {
        setError(result.error || 'Failed to load orders');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Refresh every 15 seconds
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleVerify = async (orderId: string, action: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const result = await response.json();

      if (result.success) {
        // Remove from list
        setOrders(prev => prev.filter(o => o._id !== orderId));
      } else {
        alert(result.error || 'Gagal memverifikasi pesanan');
      }
    } catch {
      alert('Gagal terhubung ke server');
    }
  };

  // Filter orders by type
  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.itemType === filter);

  // Get unique item types for filter
  const itemTypes = [...new Set(orders.map(o => o.itemType))];

  if (loading && orders.length === 0) {
    return (
      <main className="flex-1 w-full max-w-lg mx-auto p-4 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        </div>
        <PendingSkeleton />
      </main>
    );
  }

  return (
    <main className="flex-1 w-full max-w-lg mx-auto p-4 flex flex-col gap-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#1a2230] p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#1152d4] dark:text-blue-400">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{orders.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a2230] p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hari Ini</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">
              {orders.filter(o => {
                const today = new Date();
                const orderDate = new Date(o.createdAt);
                return orderDate.toDateString() === today.toDateString();
              }).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        <button
          onClick={() => setFilter('all')}
          className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 shadow-sm transition-transform active:scale-95 ${
            filter === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
          }`}
        >
          <p className="text-sm font-semibold">Semua ({orders.length})</p>
        </button>
        {itemTypes.map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-transform active:scale-95 ${
              filter === type
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-[#1a2230] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <p className="text-sm font-medium">
              {SERVICES[type as ServiceType]?.name.split(' ')[1] || type}
            </p>
          </button>
        ))}
      </div>

      {/* Error State */}
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
      {!error && filteredOrders.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-emerald-600 dark:text-emerald-400">check_circle</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Semua Terverifikasi!</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filter === 'all' 
              ? 'Tidak ada pesanan yang perlu diverifikasi.'
              : 'Tidak ada pesanan untuk filter ini.'}
          </p>
        </div>
      )}

      {/* Orders List */}
      <div className="flex flex-col gap-4">
        {filteredOrders.map(order => (
          <PendingCard 
            key={order._id} 
            order={order} 
            onVerify={handleVerify}
          />
        ))}
      </div>
    </main>
  );
}
