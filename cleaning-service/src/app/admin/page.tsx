'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { DashboardData, Order, OrderStatus } from '@/types';
import { formatCurrency, formatDate, formatRelativeTime, getInitials, getAvatarColor, getStatusColor, getStatusLabel, generateStatusBasedWhatsAppLink, isValidPhoneNumber } from '@/lib/utils';
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services';
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
function OrderCard({ order, onDelete, deletingId }: { order: Order; onDelete: (orderId: string, e: React.MouseEvent) => void; deletingId: string | null }) {
  const statusColor = getStatusColor(order.status);
  const avatarColor = getAvatarColor(order.name);
  const serviceName = SERVICES[order.itemType as ServiceType]?.name || order.itemType;
  
  // Check for proof of work - handle both new Cloudinary format and legacy base64
  const beforePhoto = order.proofOfWork?.beforePhotos?.[0];
  const afterPhoto = order.proofOfWork?.afterPhotos?.[0];
  const beforeUrl = typeof beforePhoto === 'object' && beforePhoto?.url ? beforePhoto.url : (typeof beforePhoto === 'string' ? beforePhoto : null);
  const afterUrl = typeof afterPhoto === 'object' && afterPhoto?.url ? afterPhoto.url : (typeof afterPhoto === 'string' ? afterPhoto : null);
  const hasProofOfWork = beforeUrl || afterUrl;
  
  // Get nota image URL
  const notaUrl = order.notaImage?.url || null;
  
  // Format phone number for display
  const formatPhoneDisplay = (phone: string) => {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    // Format: 0857-3185-4878
    if (cleaned.startsWith('62')) {
      cleaned = '0' + cleaned.slice(2);
    }
    return cleaned.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  // Generate direct WhatsApp link (no template message)
  const getDirectWhatsAppLink = () => {
    let cleanPhone = order.phone.replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    cleanPhone = cleanPhone.replace(/^\+/, '');
    return `https://wa.me/${cleanPhone}`;
  };

  return (
    <div className="flex flex-col p-4 bg-white dark:bg-[#1a202c] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm gap-3">
      {/* Proof of Work Preview */}
      {hasProofOfWork && (
        <div className="flex gap-2 -mx-1 -mt-1 mb-1">
          {beforeUrl && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img 
                src={beforeUrl} 
                alt="Before" 
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">Before</span>
            </div>
          )}
          {afterUrl && (
            <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img 
                src={afterUrl} 
                alt="After" 
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-0.5">After</span>
            </div>
          )}
        </div>
      )}
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
              {hasProofOfWork && (
                <>
                  <span className="text-xs text-gray-300">•</span>
                  <span className="material-symbols-outlined text-[12px] text-green-500">photo_camera</span>
                </>
              )}
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
          {/* Phone Number - Direct WhatsApp (no template) */}
          <a
            href={getDirectWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            title="Chat WhatsApp"
          >
            <span className="material-symbols-outlined text-[16px]">phone</span>
            <span className="text-xs font-medium">{formatPhoneDisplay(order.phone)}</span>
          </a>
          {/* WhatsApp with Template Message (status-based) */}
          <a
            href={generateStatusBasedWhatsAppLink(order)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            title="WhatsApp dengan template"
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
          {/* Delete Button */}
          <button
            onClick={(e) => onDelete(order._id, e)}
            disabled={deletingId === order._id}
            className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            title="Hapus pesanan"
          >
            {deletingId === order._id ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <span className="material-symbols-outlined text-[16px]">delete</span>
            )}
          </button>
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
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Add Order Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    itemType: '' as ServiceType | '',
    customItemType: '',
    quantity: 1,
    customerNotes: ''
  });

  // Form validation
  const isFormValid = useMemo(() => {
    const hasValidCustomer = formData.name.trim().length >= 2 && isValidPhoneNumber(formData.phone);
    const hasValidItem = formData.itemType !== '' && 
      (formData.itemType !== 'other' || formData.customItemType.trim().length > 0) &&
      formData.quantity >= 1;
    return hasValidCustomer && hasValidItem;
  }, [formData]);

  // Calculate estimated price
  const estimatedPrice = useMemo(() => {
    if (!formData.itemType || formData.itemType === 'other') return 0;
    const service = SERVICES[formData.itemType as ServiceType];
    return service ? service.price * formData.quantity : 0;
  }, [formData.itemType, formData.quantity]);

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

  // Handle Add Order Form Submit
  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid) {
      setFormError('Mohon lengkapi semua data yang wajib diisi');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          itemType: formData.itemType,
          customItemType: formData.customItemType,
          quantity: formData.quantity,
          customerNotes: formData.customerNotes,
          estimatedPrice: estimatedPrice,
          verified: true
        })
      });

      const result = await response.json();

      if (result.success) {
        resetForm();
        fetchData(); // Refresh dashboard
      } else {
        setFormError(result.error || 'Gagal menambahkan pesanan');
      }
    } catch {
      setFormError('Gagal terhubung ke server');
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      itemType: '',
      customItemType: '',
      quantity: 1,
      customerNotes: ''
    });
    setFormError(null);
    setShowAddForm(false);
  };

  // Handle Delete Order
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
        // Remove from local state
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            recentOrders: prev.recentOrders.filter(o => o._id !== orderId),
            total: prev.total - 1
          };
        });
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

  // Filter recent orders by search, date, and status
  const filteredOrders = data?.recentOrders.filter(order => {
    // Search filter
    const matchesSearch = !searchQuery || (
      order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.phone.includes(searchQuery) ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (SERVICES[order.itemType as ServiceType]?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customItemType || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    // Date filter
    const matchesDate = !dateFilter || (
      new Date(order.createdAt).toISOString().split('T')[0] === dateFilter
    );
    
    return matchesSearch && matchesStatus && matchesDate;
  }) || [];

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
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1152d4] text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span className="text-sm font-medium">Tambah</span>
          </button>
        </div>

        {/* Add Order Modal - Same as Orders Page */}
        {showAddForm && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50"
              onClick={resetForm}
            />
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto bg-white dark:bg-[#1a202c] rounded-2xl shadow-xl z-50 max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-[#1a202c] border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#111318] dark:text-white">Tambah Pesanan Baru</h2>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              
              <form onSubmit={handleAddOrder} className="p-4 flex flex-col gap-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {formError}
                  </div>
                )}

                {/* Customer Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all"
                    placeholder="Nama customer"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all"
                    placeholder="0812xxxx..."
                    required
                  />
                  {formData.phone && !isValidPhoneNumber(formData.phone) && (
                    <p className="text-red-500 text-xs">Format nomor tidak valid</p>
                  )}
                </div>

                {/* Address */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Alamat <span className="text-gray-400 text-xs">(Opsional)</span>
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full min-h-[80px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all resize-none"
                    placeholder="Alamat penjemputan..."
                  />
                </div>

                {/* Service Type */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Jenis Layanan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.itemType}
                    onChange={(e) => setFormData(prev => ({ ...prev, itemType: e.target.value as ServiceType }))}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled>Pilih layanan...</option>
                    {SERVICE_CATEGORIES.map((category) => (
                      <optgroup key={category.name} label={category.name}>
                        {category.services.map((service) => (
                          <option key={service.value} value={service.value}>
                            {service.label}{service.price > 0 ? ` - ${formatCurrency(service.price)}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Custom Item Type (if other selected) */}
                {formData.itemType === 'other' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                      Nama Barang <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customItemType}
                      onChange={(e) => setFormData(prev => ({ ...prev, customItemType: e.target.value }))}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all"
                      placeholder="Contoh: Boneka Besar, Stroller, dll."
                      required
                    />
                  </div>
                )}

                {/* Quantity */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Jumlah
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                      className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-symbols-outlined">remove</span>
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="w-20 h-10 text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
                      className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Catatan <span className="text-gray-400 text-xs">(Opsional)</span>
                  </label>
                  <textarea
                    value={formData.customerNotes}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerNotes: e.target.value }))}
                    className="w-full min-h-[80px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 transition-all resize-none"
                    placeholder="Catatan tambahan..."
                  />
                </div>

                {/* Price Summary */}
                {estimatedPrice > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <span className="text-sm font-medium text-[#111318] dark:text-white">Estimasi Harga</span>
                    <span className="text-lg font-bold text-[#1152d4]">{formatCurrency(estimatedPrice)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-[#111318] dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={!isFormValid || formSubmitting}
                    className="flex-1 py-3 rounded-xl bg-[#1152d4] text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {formSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">save</span>
                        <span>Simpan Pesanan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Search with Date Picker */}
        <div className="flex gap-2 mb-4">
          <div className="relative group flex-1">
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
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
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

        {/* Status Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar mb-4">
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
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

        {/* Orders List */}
        <div className="flex flex-col gap-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p>{searchQuery ? 'Tidak ada hasil' : 'Belum ada pesanan'}</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard key={order._id} order={order} onDelete={handleDelete} deletingId={deletingId} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
