'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services';
import { formatCurrency, isValidPhoneNumber } from '@/lib/utils';
import { ServiceType } from '@/types';

// Version check for deployment verification
const APP_VERSION = '2.0.2-debug-multi-submit';

interface OrderItem {
  id: number;
  itemType: ServiceType | '';
  customItemType?: string;
  quantity: number;
  notes?: string;
}

// Global submission lock to prevent ANY duplicate submissions
if (typeof window !== 'undefined') {
  (window as any).__formSubmissionLock = (window as any).__formSubmissionLock || false;
}

export default function CustomerFormPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitAttemptRef = useRef(false);
  const requestIdRef = useRef<string>('');
  
  // Log version on mount for debugging
  useEffect(() => {
    console.log(`🚀 Form App Version: ${APP_VERSION}`);
    console.log(`🔧 Deployment: ${process.env.NODE_ENV}`);
  }, []);
  
  // Customer info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Multi-item state
  const [items, setItems] = useState<OrderItem[]>([
    { id: 1, itemType: '', quantity: 1 }
  ]);

  // Auto-calculate total price
  const estimatedPrice = useMemo(() => {
    return items.reduce((total, item) => {
      if (!item.itemType || item.itemType === 'other') return total;
      const service = SERVICES[item.itemType as ServiceType];
      return total + (service ? service.price * item.quantity : 0);
    }, 0);
  }, [items]);

  // Form validation
  const isFormValid = useMemo(() => {
    const hasValidCustomer = name.trim().length >= 2 && isValidPhoneNumber(phone);
    const hasValidItems = items.every(item => 
      item.itemType !== '' && 
      (item.itemType !== 'other' || (item.customItemType?.trim().length || 0) > 0) &&
      item.quantity >= 1
    );
    return hasValidCustomer && hasValidItems && items.length > 0;
  }, [name, phone, items]);

  const handleItemChange = (id: number, field: keyof OrderItem, value: string | number) => {
    setItems(prev => {
      const updatedItems = prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      );
      
      // Auto-merge: If itemType changed, check for duplicates and merge
      if (field === 'itemType' && value !== '' && value !== 'other') {
        const currentItem = updatedItems.find(i => i.id === id);
        const duplicateItem = updatedItems.find(i => 
          i.id !== id && 
          i.itemType === value && 
          i.itemType !== 'other'
        );
        
        if (duplicateItem && currentItem) {
          // Merge: add quantity to existing item, remove current
          return updatedItems
            .map(i => i.id === duplicateItem.id 
              ? { ...i, quantity: i.quantity + currentItem.quantity }
              : i
            )
            .filter(i => i.id !== id);
        }
      }
      
      return updatedItems;
    });
    setError(null);
  };

  const addItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1;
    setItems(prev => [...prev, { id: newId, itemType: '', quantity: 1 }]);
  };

  const removeItem = (id: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate unique request ID
    const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    requestIdRef.current = requestId;
    
    console.log(`🔴 [${requestId}] handleSubmit CALLED - START`);
    console.log(`🔴 [${requestId}] Call stack:`, new Error().stack);
    console.log(`🔴 [${requestId}] Event target:`, e.target);
    console.log(`🔴 [${requestId}] Event type:`, e.type);
    console.log(`🔴 [${requestId}] submitAttemptRef.current:`, submitAttemptRef.current);
    console.log(`🔴 [${requestId}] isSubmitting:`, isSubmitting);
    console.log(`🔴 [${requestId}] window.__formSubmissionLock:`, (window as any).__formSubmissionLock);
    
    // TRIPLE LOCK: Check window-level, ref, and state
    if ((window as any).__formSubmissionLock || submitAttemptRef.current || isSubmitting) {
      console.log(`⚠️ [${requestId}] BLOCKED: Duplicate submission attempt!`);
      console.log(`   - window lock: ${(window as any).__formSubmissionLock}`);
      console.log(`   - ref lock: ${submitAttemptRef.current}`);
      console.log(`   - state lock: ${isSubmitting}`);
      return;
    }
    
    // SET ALL LOCKS
    (window as any).__formSubmissionLock = true;
    submitAttemptRef.current = true;
    setIsSubmitting(true);
    
    setError(null);
    
    console.log(`📤 [${requestId}] Form validation passed`);
    
    if (!isFormValid) {
      (window as any).__formSubmissionLock = false;
      submitAttemptRef.current = false;
      setIsSubmitting(false);
      setError('Mohon lengkapi semua data yang wajib diisi');
      return;
    }

    // Double check items before submit
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error(`❌ [${requestId}] CRITICAL: Items state is invalid!`, { items });
      (window as any).__formSubmissionLock = false;
      submitAttemptRef.current = false;
      setIsSubmitting(false);
      setError('Data items tidak valid. Silakan refresh halaman dan coba lagi.');
      return;
    }

    console.log(`📤 [${requestId}] Submitting order`);
    console.log(`📤 [${requestId}] Items state:`, JSON.stringify(items, null, 2));

    try {
      // Filter out any items with empty itemType - more defensive
      const validItems = items.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('⚠️ [FORM] Invalid item object:', item);
          return false;
        }
        const hasItemType = item.itemType && 
                            typeof item.itemType === 'string' && 
                            item.itemType.trim() !== '';
        console.log(`📋 [FORM] Item ${item.id}: itemType="${item.itemType}" valid=${hasItemType}`);
        return hasItemType;
      });
      
      console.log(`📋 [${requestId}] Valid items count: ${validItems.length}/${items.length}`);
      
      if (validItems.length === 0) {
        throw new Error('Mohon pilih minimal 1 jenis barang');
      }

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address?.trim() || '',
        items: validItems.map(item => ({
          itemType: item.itemType as string,
          customItemType: item.customItemType?.trim() || '',
          quantity: Number(item.quantity) || 1,
          notes: item.notes?.trim() || ''
        }))
      };

      // Final validation before send
      if (!payload.items || payload.items.length === 0) {
        throw new Error('CRITICAL: Payload items empty after mapping');
      }

      console.log(`📦 [${requestId}] Final payload:`, JSON.stringify(payload, null, 2));
      console.log(`🚀 [${requestId}] ===== CALLING FETCH - THIS SHOULD APPEAR ONCE! =====`);
      const fetchStartTime = Date.now();
      
      // Submit all items as ONE order with multiple items
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Timestamp': new Date().toISOString(),
          'X-App-Version': APP_VERSION,
          'X-Request-ID': requestId
        },
        body: JSON.stringify(payload)
      });

      const fetchEndTime = Date.now();
      console.log(`⏱️ [${requestId}] Fetch completed in ${fetchEndTime - fetchStartTime}ms`);

      const result = await response.json();
      console.log(`📬 [${requestId}] Response status:`, response.status);
      console.log(`📬 [${requestId}] Response data:`, result);

      if (!response.ok || !result.success) {
        const errorMsg = result.error || 'Gagal membuat pesanan';
        console.error(`❌ [${requestId}] Server returned error:`, errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`✅ [${requestId}] Order created successfully:`, result.data.orderNumber);
      
      // Reset ALL locks before redirect
      (window as any).__formSubmissionLock = false;
      submitAttemptRef.current = false;
      
      // Redirect to success page
      router.push('/form/success?orderId=' + result.data.orderId);
    } catch (err) {
      console.error(`❌ [${requestIdRef.current}] Submit error:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
      console.error(`❌ [${requestIdRef.current}] Error message to show:`, errorMessage);
      setError(errorMessage);
      
      // Release ALL locks on error
      (window as any).__formSubmissionLock = false;
      submitAttemptRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] min-h-screen flex flex-col">
      {/* Top App Bar */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-[#1a2230]/95 backdrop-blur-md border-b border-[#dbdfe6] dark:border-[#2a3441] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/f_auto,q_auto,w_200/v1768543427/logo_tcs_keooto.png" 
            alt="Teman Cuci Sepatu" 
            className="w-10 h-10 object-contain"
          />
        </div>
        <h1 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">
          Form Teman Cuci Sepatu
        </h1>
        <div className="w-2"></div>
      </div>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 pb-24">
        {/* Header Text */}
        <div className="mb-8 text-center">
          <h2 className="text-[#111318] dark:text-white text-2xl font-bold mb-2">
            Teman Cuci Sepatu
          </h2>
          <p className="text-[#616f89] dark:text-gray-400 text-sm">
            Isi data di bawah ini untuk layanan penjemputan gratis ke lokasi Anda.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Name Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                className="w-full h-12 px-4 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all"
                placeholder="Masukkan nama lengkap anda"
                required
              />
            </div>
          </div>

          {/* Phone Input */}
          <div className="flex flex-col gap-2">
            <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
              Nomor WhatsApp <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setError(null); }}
                className="w-full h-12 pl-4 pr-12 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all"
                placeholder="0812xxxx..."
                required
              />
              <div className="absolute right-4 text-[#616f89] dark:text-gray-500 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-xl">call</span>
              </div>
            </div>
            {phone && !isValidPhoneNumber(phone) && (
              <p className="text-red-500 text-xs mt-1">Format nomor tidak valid</p>
            )}
          </div>

          {/* Address Input (Optional) */}
          <div className="flex flex-col gap-2">
            <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
              Alamat Penjemputan{' '}
              <span className="text-[#616f89] font-normal text-xs ml-1">(Opsional)</span>
            </label>
            <div className="relative">
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full min-h-[100px] p-4 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all resize-none"
                placeholder="Jalan Mawar No. 10, Jakarta Selatan..."
              />
              <div className="absolute right-4 top-4 text-[#616f89] dark:text-gray-500 pointer-events-none">
                <span className="material-symbols-outlined text-xl">location_on</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#dbdfe6] dark:bg-[#2a3441] w-full my-2"></div>

          {/* Item Cards */}
          {items.map((item, index) => (
            <div key={item.id} className="p-5 rounded-2xl bg-white dark:bg-[#1a2230] border border-[#dbdfe6] dark:border-[#2a3441] shadow-sm relative overflow-hidden">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#dbdfe6] dark:border-[#2a3441]">
                <div className="flex items-center gap-2">
                  <div className="bg-[#1152d4]/10 text-[#1152d4] p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-lg">laundry</span>
                  </div>
                  <h3 className="font-bold text-[#111318] dark:text-white text-sm uppercase tracking-wide">Detail Item {index + 1}</h3>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                )}
              </div>

              {/* Item Type Dropdown with Categories */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                  Jenis Layanan
                </label>
                <div className="relative">
                  <select
                    value={item.itemType}
                    onChange={(e) => handleItemChange(item.id, 'itemType', e.target.value)}
                    className="w-full h-12 pl-4 pr-10 appearance-none rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-[#f6f6f8] dark:bg-[#101622] text-[#111318] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all cursor-pointer"
                    required
                  >
                    <option value="" disabled>
                      Pilih layanan...
                    </option>
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
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] dark:text-gray-500 pointer-events-none flex items-center">
                    <span className="material-symbols-outlined text-xl">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Custom Item Type Input */}
              {item.itemType === 'other' && (
                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                    Nama Barang <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.customItemType || ''}
                    onChange={(e) => handleItemChange(item.id, 'customItemType', e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-[#f6f6f8] dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all"
                    placeholder="Contoh: Boneka Besar, Stroller, dll."
                    required
                  />
                </div>
              )}

              {/* Quantity Input with +/- buttons */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                  Jumlah Barang
                </label>
                <div className="flex items-center justify-between border border-[#dbdfe6] dark:border-[#2a3441] rounded-xl p-1 bg-[#f6f6f8] dark:bg-[#101622] h-12">
                  <button
                    type="button"
                    onClick={() => handleItemChange(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                    className="size-10 rounded-lg flex items-center justify-center text-[#616f89] hover:text-[#111318] dark:hover:text-white hover:bg-white dark:hover:bg-[#1a2230] hover:shadow-sm transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">remove</span>
                  </button>
                  <span className="font-bold text-lg text-[#111318] dark:text-white min-w-[32px] text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => handleItemChange(item.id, 'quantity', Math.min(99, item.quantity + 1))}
                    className="size-10 rounded-lg flex items-center justify-center text-[#1152d4] hover:text-white bg-white dark:bg-[#1a2230] shadow-sm hover:bg-[#1152d4] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-2">
                <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                  Catatan Tambahan{' '}
                  <span className="text-[#616f89] font-normal text-xs ml-1">(Opsional)</span>
                </label>
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                  className="w-full min-h-[80px] p-3 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-[#f6f6f8] dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all resize-none text-sm"
                  placeholder="Contoh: Noda tinta di bagian samping, tali sepatu diganti, dll..."
                />
              </div>

              {/* Item Subtotal */}
              {item.itemType && item.itemType !== 'other' && (
                <div className="mt-4 pt-3 border-t border-[#dbdfe6] dark:border-[#2a3441] flex justify-between items-center">
                  <span className="text-sm text-[#616f89]">Subtotal</span>
                  <span className="font-semibold text-[#1152d4]">
                    {formatCurrency((SERVICES[item.itemType as ServiceType]?.price || 0) * item.quantity)}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Add More Item Button */}
          <button
            type="button"
            onClick={addItem}
            className="w-full py-3.5 rounded-xl border border-dashed border-[#1152d4]/40 bg-[#1152d4]/5 hover:bg-[#1152d4]/10 text-[#1152d4] font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
          >
            <div className="p-0.5 rounded-full border border-[#1152d4]/40 flex items-center justify-center group-hover:border-[#1152d4] transition-colors">
              <span className="material-symbols-outlined text-base">add</span>
            </div>
            <span>Tambah Barang Lain</span>
          </button>

          {/* Price Summary Card */}
          <div className="mt-4 p-5 rounded-2xl bg-[#1152d4]/5 dark:bg-[#1152d4]/20 border border-[#1152d4]/20 flex flex-col items-center justify-center gap-1 text-center shadow-sm">
            <span className="text-[#616f89] dark:text-gray-300 text-sm font-medium uppercase tracking-wide">
              Estimasi Total Biaya ({items.length} item)
            </span>
            <span className="text-[#1152d4] dark:text-blue-400 text-3xl font-extrabold tracking-tight">
              {formatCurrency(estimatedPrice)}
            </span>
            <p className="text-xs text-[#616f89] dark:text-gray-400 mt-1">
              *Harga final dikonfirmasi saat penjemputan
            </p>
          </div>

          {/* Submit Button - Disabled */}
          <div className="fixed bottom-0 left-0 w-full bg-white/80 dark:bg-[#1a2230]/80 backdrop-blur-lg border-t border-[#dbdfe6] dark:border-[#2a3441] p-4 z-40">
            <div className="max-w-md mx-auto w-full">
              <div className="mb-2 text-center">
                <p className="text-xs text-[#616f89] dark:text-gray-400">
                  Form ini sedang tidak aktif. Untuk pemesanan, hubungi admin.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="w-full h-14 bg-gray-400 dark:bg-gray-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <span>Form Tidak Aktif</span>
                <span className="material-symbols-outlined">
                  block
                </span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
