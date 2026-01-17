'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Order, OrderStatus } from '@/types';
import { formatCurrency, formatRelativeTime, getInitials, getAvatarColor, getStatusColor, getStatusLabel, isValidPhoneNumber } from '@/lib/utils';
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services';
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
          // Admin-created orders are automatically verified
          verified: true
        })
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          name: '',
          phone: '',
          address: '',
          itemType: '',
          customItemType: '',
          quantity: 1,
          customerNotes: ''
        });
        setShowAddForm(false);
        // Refresh orders list
        fetchOrders();
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
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1152d4] text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          <span className="text-sm font-medium">Tambah</span>
        </button>
      </div>

      {/* Add Order Modal */}
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
                    <optgroup key={category.label} label={category.label}>
                      {category.services.map((serviceKey) => {
                        const service = SERVICES[serviceKey];
                        return (
                          <option key={serviceKey} value={serviceKey}>
                            {service.name}{service.price > 0 ? ` - ${formatCurrency(service.price)}` : ''}
                          </option>
                        );
                      })}
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
          const whatsappLink = `https://wa.me/62${order.phone.replace(/^0/, '')}`;

          return (
            <div
              key={order._id}
              className="flex flex-col p-4 bg-white dark:bg-[#1a202c] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm"
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
                </div>
              </Link>

              {/* Footer with Status, Actions */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                  {getStatusLabel(order.status)}
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    title="Chat WhatsApp"
                  >
                    <span className="material-symbols-outlined text-[16px]">phone</span>
                    <span className="text-xs font-medium">{order.phone}</span>
                  </a>
                  <Link
                    href={`/admin/orders/${order._id}`}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </Link>
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(order._id, e)}
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
