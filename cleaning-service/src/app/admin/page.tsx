'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { DashboardData, Order, OrderStatus, CloudinaryImage } from '@/types';
import { formatCurrency, formatDate, formatDateShort, formatRelativeTime, formatDateTimeFull, getInitials, getAvatarColor, getStatusColor, getStatusLabel, isValidContactValue } from '@/lib/utils';
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services';
import { ServiceType } from '@/types';
import PhoneAutocomplete from '@/components/PhoneAutocomplete';

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
              {SERVICES[item.name as ServiceType]?.name || item.name} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({ order, onDelete, deletingId }: { order: Order; onDelete: (orderId: string, e: React.MouseEvent) => void; deletingId: string | null }) {
  const statusColor = getStatusColor(order.status);
  const avatarColor = getAvatarColor(order.name);
  
  // Get items list for display
  const hasItems = order.items && order.items.length > 0;
  const itemsList = hasItems 
    ? order.items!.map(item => ({
        name: SERVICES[item.serviceType as ServiceType]?.name || item.customItemType || item.serviceType,
        quantity: item.quantity || 1
      }))
    : [{ name: SERVICES[order.itemType as ServiceType]?.name || order.itemType, quantity: order.quantity || 1 }];
  
  const totalQuantity = itemsList.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  // Check for proof of work - handle both new Cloudinary format and legacy base64
  // Get before photos
  const beforePhotos: Array<{ url: string; type: 'before' }> = [];
  if (order.proofOfWork?.beforePhotos) {
    order.proofOfWork.beforePhotos.forEach((photo: any) => {
      const url = typeof photo === 'object' && photo?.url ? photo.url : (typeof photo === 'string' ? photo : null);
      if (url) beforePhotos.push({ url, type: 'before' });
    });
  }
  
  // Get after photos
  const afterPhotos: Array<{ url: string; type: 'after' }> = [];
  if (order.proofOfWork?.afterPhotos) {
    order.proofOfWork.afterPhotos.forEach((photo: any) => {
      const url = typeof photo === 'object' && photo?.url ? photo.url : (typeof photo === 'string' ? photo : null);
      if (url) afterPhotos.push({ url, type: 'after' });
    });
  }
  
  return (
    <div className="flex flex-col p-4 bg-white dark:bg-[#1a202c] rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm gap-3">
      {/* Proof of Work Preview */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="flex flex-col gap-3 -mx-1 -mt-1 mb-1">
          {/* Before Photos */}
          {beforePhotos.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-1 block">Before</span>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                {beforePhotos.map((photo, index) => (
                  <div key={`before-${index}`} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img 
                      src={photo.url} 
                      alt={`Before ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* After Photos */}
          {afterPhotos.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 mb-1 block">After</span>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1">
                {afterPhotos.map((photo, index) => (
                  <div key={`after-${index}`} className="relative aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img 
                      src={photo.url} 
                      alt={`After ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`${avatarColor} rounded-full h-10 w-10 flex items-center justify-center font-bold text-sm`}>
            {getInitials(order.name)}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#111318] dark:text-white">{order.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {totalQuantity} item{totalQuantity > 1 ? 's' : ''}
              {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="material-symbols-outlined text-[11px] text-green-500">photo_camera</span>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#111318] dark:text-white">
            {formatCurrency(order.finalPrice || order.estimatedPrice || 0)}
          </p>
          <div className="flex flex-col items-end">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-300">{formatDate(order.createdAt)}</p>
            <p className="text-[10px] text-gray-400">{formatRelativeTime(order.createdAt)}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-1 pt-3 border-t border-gray-50 dark:border-gray-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {getStatusLabel(order.status)}
          </span>
          {order.status === 'finished' && order.finishedAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              · {formatDateTimeFull(order.finishedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
  const [serviceDistributionLoading, setServiceDistributionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [servicePeriod, setServicePeriod] = useState<'all' | 'monthly'>('all');
  const [serviceFlow, setServiceFlow] = useState<'incoming' | 'outgoing'>('incoming');
  const [selectedServiceMonth, setSelectedServiceMonth] = useState(() => {
    const nowInWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
    return nowInWIB.toISOString().slice(0, 7);
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersRequestIdRef = useRef(0);
  const analyticsRequestIdRef = useRef(0);
  const PAGE_SIZE = 10;

  // Add Order Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    itemType: '' as ServiceType | '',
    quantity: 1,
    customerNotes: ''
  });

  // Image upload state for form
  const [formProofOfWork, setFormProofOfWork] = useState<{ beforePhotos: CloudinaryImage[] }>({ beforePhotos: [] });
  const [formUploading, setFormUploading] = useState<'before' | null>(null);
  const [formUploadProgress, setFormUploadProgress] = useState<{ type: 'before', current: number, total: number } | null>(null);
  const [formDeletingPhoto, setFormDeletingPhoto] = useState<string | null>(null);

  // Form validation
  const isFormValid = useMemo(() => {
    const hasValidCustomer = formData.name.trim().length >= 2 && isValidContactValue(formData.phone);
    const hasValidItem = formData.itemType !== '' && formData.quantity >= 1;
    return hasValidCustomer && hasValidItem;
  }, [formData]);

  // Calculate estimated price
  const estimatedPrice = useMemo(() => {
    if (!formData.itemType) return 0;
    const service = SERVICES[formData.itemType as ServiceType];
    return service ? service.price * formData.quantity : 0;
  }, [formData.itemType, formData.quantity]);

  const fetchAnalytics = useCallback(async () => {
    const requestId = ++analyticsRequestIdRef.current;

    try {
      setServiceDistributionLoading(true);

      const params = new URLSearchParams({ type: 'analytics' });
      params.set('serviceFlow', serviceFlow);
      if (servicePeriod === 'monthly') {
        params.set('serviceMonth', selectedServiceMonth);
      }

      const response = await fetch(`/api/dashboard?${params}`);
      const result = await response.json();
      if (requestId === analyticsRequestIdRef.current && result.success) {
        // Destructure out recentOrders so it can never overwrite the orders list
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { recentOrders: _omit, ...analyticsFields } = result.data as any;
        setData(prev => prev
          ? { ...prev, ...analyticsFields }
          : { ...analyticsFields, recentOrders: [] }
        );
      }
    } catch {
      // Analytics fetch failure is non-critical
    } finally {
      if (requestId === analyticsRequestIdRef.current) {
        setServiceDistributionLoading(false);
      }
    }
  }, [selectedServiceMonth, servicePeriod, serviceFlow]);

  const fetchData = useCallback(async (
    page = 1,
    status: OrderStatus | 'all' = 'all',
    search = '',
    date = '',
    signal?: AbortSignal
  ) => {
    const requestId = ++ordersRequestIdRef.current;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        type: 'orders',
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
        sort: status === 'finished' ? 'finishedAt:desc' : 'createdAt:desc'
      });
      if (status !== 'all') params.set('status', status);
      if (search) params.set('search', search);
      if (date) params.set('date', date);
      
      const response = await fetch(`/api/dashboard?${params}`, { signal });
      const result = await response.json();

      if (requestId !== ordersRequestIdRef.current) return;
      
      if (result.success) {
        // Merge orders into data, preserving analytics fields already loaded
        setData(prev => prev
          ? { ...prev, recentOrders: result.data.recentOrders }
          : {
              total: 0, pending: 0, inProgress: 0, delivered: 0,
              pickedUp: 0, finished: 0, serviceDistribution: [], incomeTrend: [],
              discoverySourceDistribution: [],
              discoverySourceSummary: {
                totalCustomers: 0,
                answeredCustomers: 0,
                unansweredCustomers: 0,
              },
              recentOrders: result.data.recentOrders
            }
        );
        setTotalPages(result.meta.totalPages);
        setTotalOrders(result.meta.total);
        setCurrentPage(result.meta.page);
      } else {
        setError(result.error || 'Failed to load dashboard');
      }
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') return;
      if (requestId === ordersRequestIdRef.current) {
        setError('Failed to connect to server');
      }
    } finally {
      if (requestId === ordersRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [PAGE_SIZE]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(currentPage, statusFilter, debouncedSearchQuery, dateFilter, controller.signal);
    return () => controller.abort();
  }, [currentPage, statusFilter, debouncedSearchQuery, dateFilter, fetchData]);

  // Handle multiple image upload for form
  const handleFormImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setFormUploading('before');
    setFormUploadProgress({ type: 'before', current: 0, total: fileArray.length });

    const successfulUploads: CloudinaryImage[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      try {
        const tempId = `temp-${Date.now()}-${i}`;
        const tempImage: CloudinaryImage = {
          url: URL.createObjectURL(file),
          publicId: tempId,
        };

        setFormProofOfWork(prev => ({ beforePhotos: [...prev.beforePhotos, tempImage] }));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'before');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success && result.data) {
          const realImage: CloudinaryImage = {
            url: result.data.url,
            publicId: result.data.publicId,
          };

          setFormProofOfWork(prev => ({
            beforePhotos: prev.beforePhotos.map(img =>
              img.publicId === tempId ? realImage : img
            )
          }));

          successfulUploads.push(realImage);
        } else {
          setFormProofOfWork(prev => ({
            beforePhotos: prev.beforePhotos.filter(img => img.publicId !== tempId)
          }));
          console.error('Upload failed:', result.error);
        }

        setFormUploadProgress({ type: 'before', current: i + 1, total: fileArray.length });
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    setFormUploading(null);
    setFormUploadProgress(null);

    if (successfulUploads.length > 0) {
      alert(`${successfulUploads.length} foto berhasil diunggah!`);
    }
  };

  const handleFormDeletePhoto = async (publicId: string) => {
    if (!confirm('Hapus foto ini?')) return;

    const backup = [...formProofOfWork.beforePhotos];

    setFormProofOfWork(prev => ({
      beforePhotos: prev.beforePhotos.filter(img => img.publicId !== publicId)
    }));

    setFormDeletingPhoto(publicId);

    try {
      const response = await fetch(`/api/upload?publicId=${publicId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        setFormProofOfWork(prev => ({ beforePhotos: backup }));
        alert(result.error || 'Gagal menghapus foto');
      }
    } catch (error) {
      setFormProofOfWork(prev => ({ beforePhotos: backup }));
      alert('Gagal menghapus foto');
    } finally {
      setFormDeletingPhoto(null);
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
      const cleanProofOfWork = {
        beforePhotos: formProofOfWork.beforePhotos.filter(p => !p.publicId.startsWith('temp-'))
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          itemType: formData.itemType,
          quantity: formData.quantity,
          customerNotes: formData.customerNotes,
          estimatedPrice: estimatedPrice,
          status: 'pending',
          proofOfWork: cleanProofOfWork.beforePhotos.length > 0 ? cleanProofOfWork : undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        resetForm();
        fetchAnalytics(); // update KPI counts + charts
        fetchData(currentPage, statusFilter, debouncedSearchQuery, dateFilter); // refresh order list
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
      quantity: 1,
      customerNotes: ''
    });
    setFormProofOfWork({ beforePhotos: [] });
    setFormUploadProgress(null);
    setFormUploading(null);
    setFormDeletingPhoto(null);
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
        // Refetch both: analytics (counts change) and order list
        fetchAnalytics();
        await fetchData(currentPage, statusFilter, debouncedSearchQuery, dateFilter);
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
    { value: 'finished', label: 'Selesai', icon: 'check_circle' }
  ];

  const getStatusCount = (status: OrderStatus | 'all'): number => {
    if (status === 'all') return data?.total || 0;
    switch (status) {
      case 'pending': return data?.pending || 0;
      case 'finished': return data?.finished || 0;
      default: return 0;
    }
  };

  // Search, status, and date filters are applied by MongoDB before pagination.
  const filteredOrders = data?.recentOrders || [];

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error}</p>
        <button
          onClick={() => fetchData(currentPage, statusFilter, debouncedSearchQuery, dateFilter)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Total Orders */}
          <div className="group relative overflow-hidden rounded-2xl min-h-[140px] bg-gradient-to-br from-orange-50/50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-800/10 p-5 shadow-md ring-1 ring-orange-200/50 dark:ring-orange-700/30 transition-all hover:shadow-lg hover:scale-[1.02]">
            <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-gradient-to-br from-orange-400/20 to-orange-600/20 blur-xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                  <span className="material-symbols-outlined text-white text-[20px]">list_alt</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Total Orders</p>
              </div>
              <p className="text-[#111318] dark:text-white text-3xl font-extrabold tracking-tight">
                {data?.total.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Finished */}
          <div className="group relative overflow-hidden rounded-2xl min-h-[140px] bg-gradient-to-br from-emerald-50/50 to-emerald-100/50 dark:from-emerald-900/10 dark:to-emerald-800/10 p-5 shadow-md ring-1 ring-emerald-200/50 dark:ring-emerald-700/30 transition-all hover:shadow-lg hover:scale-[1.02]">
            <div className="absolute top-0 right-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 blur-xl" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30">
                  <span className="material-symbols-outlined text-white text-[20px]">check_circle</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-[11px] font-semibold uppercase tracking-wider">Selesai</p>
              </div>
              <p className="text-[#111318] dark:text-white text-3xl font-extrabold tracking-tight">
                {data?.finished.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="px-4">
        <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">Analitik</h2>
        <div className="grid grid-cols-1 gap-4">
          {/* Service Distribution Pie Chart */}
          <div className="rounded-xl bg-white dark:bg-[#1a202c] p-5 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-6">
              <div>
                <p className="text-[#111318] dark:text-white text-base font-bold">Layanan</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  {serviceFlow === 'incoming' ? 'Jasa masuk' : 'Jasa keluar (selesai)'}
                  {servicePeriod === 'monthly' && ` · ${new Date(`${selectedServiceMonth}-01T00:00:00.000+07:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`}
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={serviceFlow}
                  onChange={(event) => setServiceFlow(event.target.value as 'incoming' | 'outgoing')}
                  aria-label="Pilih arus layanan"
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 dark:border-gray-700 dark:bg-[#0f1724] dark:text-gray-200"
                >
                  <option value="incoming">Masuk</option>
                  <option value="outgoing">Keluar</option>
                </select>
                <select
                  value={servicePeriod}
                  onChange={(event) => setServicePeriod(event.target.value as 'all' | 'monthly')}
                  aria-label="Periode distribusi layanan"
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 dark:border-gray-700 dark:bg-[#0f1724] dark:text-gray-200"
                >
                  <option value="all">Semua Data</option>
                  <option value="monthly">Per Bulan</option>
                </select>
                {servicePeriod === 'monthly' && (
                  <input
                    type="month"
                    value={selectedServiceMonth}
                    onChange={(event) => {
                      if (event.target.value) setSelectedServiceMonth(event.target.value);
                    }}
                    aria-label="Pilih bulan layanan"
                    className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 dark:border-gray-700 dark:bg-[#0f1724] dark:text-gray-200"
                  />
                )}
                <span className="material-symbols-outlined text-gray-400">pie_chart</span>
              </div>
            </div>
            {serviceDistributionLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#1152d4]" />
              </div>
            ) : (
              <PieChart data={data?.serviceDistribution || []} />
            )}
          </div>
        </div>
      </section>

      {/* Recent Orders Section */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Pesanan Terbaru</h2>
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

                {/* Contact */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Kontak <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <PhoneAutocomplete
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Nomor WA / Instagram / LinkedIn / kontak lain"
                      required
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] dark:text-gray-500 pointer-events-none">
                      <span className="material-symbols-outlined text-xl">call</span>
                    </div>
                  </div>
                  <p className="text-[#616f89] dark:text-gray-500 text-xs">
                    Bisa diisi nomor WhatsApp, username Instagram, LinkedIn, atau kontak lain.
                  </p>
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

                {/* Proof of Work Photos */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-sm font-medium text-[#111318] dark:text-gray-200">
                    Foto Bukti Pekerjaan <span className="text-gray-400 text-xs">(Opsional)</span>
                  </h3>

                  {/* Before Photos */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Foto Sebelum</label>
                    <div className="flex flex-wrap gap-3">
                      {formProofOfWork.beforePhotos.map((photo, index) => (
                        <div key={photo.publicId} className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                          <img 
                            src={photo.url} 
                            alt={`Before ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {photo.publicId.startsWith('temp-') && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                          {!photo.publicId.startsWith('temp-') && (
                            <button
                              type="button"
                              onClick={() => handleFormDeletePhoto(photo.publicId)}
                              disabled={formDeletingPhoto === photo.publicId}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                            >
                              {formDeletingPhoto === photo.publicId ? (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <span className="material-symbols-outlined text-sm">close</span>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {/* Upload Button */}
                      <label className={`w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-[#1152d4] dark:hover:border-[#1152d4] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all ${formUploading === 'before' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => e.target.files && handleFormImageUpload(e.target.files)}
                          disabled={formUploading === 'before'}
                          className="hidden"
                        />
                        {formUploading === 'before' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-[#1152d4] border-t-transparent rounded-full animate-spin mb-1"></div>
                            {formUploadProgress && formUploadProgress.type === 'before' && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formUploadProgress.current}/{formUploadProgress.total}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-gray-400 text-2xl">add_photo_alternate</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
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
          <div className="relative group flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#1152d4] transition-colors text-[20px]">search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#1a202c] text-sm text-[#111318] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1152d4] outline-none shadow-sm transition-all"
              placeholder="Cari nama, kontak, layanan, atau nomor order..."
            />
          </div>
          <div className="relative group w-48 sm:w-52 shrink-0">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <span className="material-symbols-outlined text-gray-400 group-focus-within:text-[#1152d4] transition-colors text-[20px]">calendar_today</span>
            </div>
            {!dateFilter && (
              <span className="absolute left-10 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">
                DD/MM/YYYY
              </span>
            )}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border-none ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-[#1a202c] text-sm text-[#111318] dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#1152d4] outline-none shadow-sm transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                dateFilter 
                  ? '[&::-webkit-datetime-edit-text]:text-[#111318] [&::-webkit-datetime-edit-month-field]:text-[#111318] [&::-webkit-datetime-edit-day-field]:text-[#111318] [&::-webkit-datetime-edit-year-field]:text-[#111318] dark:[&::-webkit-datetime-edit-text]:text-white dark:[&::-webkit-datetime-edit-month-field]:text-white dark:[&::-webkit-datetime-edit-day-field]:text-white dark:[&::-webkit-datetime-edit-year-field]:text-white'
                  : '[&::-webkit-datetime-edit-text]:text-transparent [&::-webkit-datetime-edit-month-field]:text-transparent [&::-webkit-datetime-edit-day-field]:text-transparent [&::-webkit-datetime-edit-year-field]:text-transparent'
              }`}
            />
            {dateFilter && (
              <button
                onClick={() => {
                  setDateFilter('');
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar mb-4">
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => {
                setStatusFilter(option.value);
                setCurrentPage(1); // Reset to page 1 when filter changes
              }}
              className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4 transition-all ${
                statusFilter === option.value
                  ? 'bg-[#1152d4] text-white shadow-md'
                  : 'bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{option.icon}</span>
              <span className="text-sm font-medium">{option.label} ({getStatusCount(option.value)})</span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading && data && (
          <div className="flex items-center gap-2 mb-3 text-sm text-[#1152d4]">
            <span className="inline-block w-4 h-4 border-2 border-[#1152d4]/30 border-t-[#1152d4] rounded-full animate-spin" />
            Memperbarui hasil...
          </div>
        )}
        <div className={`flex flex-col gap-3 transition-opacity ${loading && data ? 'opacity-60' : 'opacity-100'}`}>
          {filteredOrders.length === 0 && !loading ? (
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Menampilkan {totalOrders === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE + 1)} - {Math.min(currentPage * PAGE_SIZE, totalOrders)} dari {totalOrders}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Halaman sebelumnya"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show condensed pagination for many pages
                  if (totalPages > 7) {
                    if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 2) {
                      // Show ellipsis
                      if (page === 2 && currentPage > 4) {
                        return <span key={page} className="px-2 text-gray-400">…</span>;
                      }
                      if (page === totalPages - 1 && currentPage < totalPages - 3) {
                        return <span key={page} className="px-2 text-gray-400">…</span>;
                      }
                      return null;
                    }
                  }
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      disabled={loading}
                      className={`min-w-[36px] px-3 py-1.5 rounded-lg transition-colors ${
                        page === currentPage
                          ? 'bg-[#1152d4] text-white'
                          : 'bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              {/* Mobile: Show current page only */}
              <div className="sm:hidden px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a202c] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Halaman berikutnya"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
