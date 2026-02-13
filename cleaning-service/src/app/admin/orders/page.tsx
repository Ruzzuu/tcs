'use client';

import { useState, useRef } from 'react';
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services';
import PhoneAutocomplete from '@/components/PhoneAutocomplete';

// Global submission lock
if (typeof window !== 'undefined') {
  (window as any).__adminFormSubmissionLock = (window as any).__adminFormSubmissionLock || false;
}

interface FormItem {
  service: string;
  quantity: number;
  notes: string;
}

export default function AdminForm() {
  const [formData, setFormData] = useState({
    customerName: '',
    whatsapp: '',
    address: '',
  });
  const [items, setItems] = useState<FormItem[]>([
    { service: '', quantity: 1, notes: '' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitAttemptRef = useRef(false);
  const requestIdRef = useRef<string>('');

  const addItem = () => {
    setItems([...items, { service: '', quantity: 1, notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const incrementQuantity = (index: number) => {
    updateItem(index, 'quantity', items[index].quantity + 1);
  };

  const decrementQuantity = (index: number) => {
    if (items[index].quantity > 1) {
      updateItem(index, 'quantity', items[index].quantity - 1);
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const service = SERVICE_CATEGORIES
        .flatMap(cat => cat.services)
        .find(s => s.value === item.service);
      return sum + (service?.price || 0) * item.quantity;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate unique request ID
    const requestId = `ADMIN-REQ-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    requestIdRef.current = requestId;
    
    console.log(`🔴 [${requestId}] Admin form submit START`);
    
    // TRIPLE LOCK: Check window-level, ref, and state
    if ((window as any).__adminFormSubmissionLock || submitAttemptRef.current || isSubmitting) {
      console.log(`⚠️ [${requestId}] BLOCKED: Duplicate submission!`);
      return;
    }
    
    // SET ALL LOCKS
    (window as any).__adminFormSubmissionLock = true;
    submitAttemptRef.current = true;
    setIsSubmitting(true);
    
    const validItems = items.filter(item => item.service && item.quantity > 0);
    if (validItems.length === 0) {
      alert('Tambahkan minimal 1 item layanan');
      (window as any).__adminFormSubmissionLock = false;
      submitAttemptRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      // Send ONE request with ALL items as array (NEW FORMAT)
      const payload = {
        name: formData.customerName,
        phone: formData.whatsapp,
        address: formData.address,
        items: validItems.map(item => ({
          itemType: item.service,
          customItemType: '',
          quantity: item.quantity,
          notes: item.notes
        }))
      };
      
      console.log(`📦 [${requestId}] Payload:`, JSON.stringify(payload, null, 2));
      console.log(`🚀 [${requestId}] Sending ONE request with ${validItems.length} items`);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Source': 'admin-form'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log(`📬 [${requestId}] Response:`, result);

      if (response.ok && result.success) {
        console.log(`✅ [${requestId}] Order created:`, result.data.orderNumber);
        
        // Release locks before redirect
        (window as any).__adminFormSubmissionLock = false;
        submitAttemptRef.current = false;
        
        // Redirect to success page
        window.location.href = '/admin/orders/success';
      } else {
        const errorMsg = result.error || 'Gagal mengirim data';
        console.error(`❌ [${requestId}] Error:`, errorMsg);
        alert(errorMsg);
        
        // Release locks on error
        (window as any).__adminFormSubmissionLock = false;
        submitAttemptRef.current = false;
      }
    } catch (error) {
      console.error(`❌ [${requestIdRef.current}] Exception:`, error);
      alert('Terjadi kesalahan');
      
      // Release locks on error
      (window as any).__adminFormSubmissionLock = false;
      submitAttemptRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.customerName && formData.whatsapp && items.some(item => item.service);

  return (
    <div className="bg-[#f6f6f8] dark:bg-[#101622] min-h-screen flex flex-col">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#1a2230] dark:bg-[#1a2230] border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1152d4]/20 text-[#1152d4]">
              <span className="material-symbols-outlined text-xl">cleaning_services</span>
            </div>
            <h1 className="text-white text-lg font-bold">Teman Cuci Sepatu</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">dashboard</span>
              <span className="text-sm font-medium">Dashboard</span>
            </a>
            <a
              href="/admin/orders"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1152d4] text-white shadow-lg shadow-[#1152d4]/20"
            >
              <span className="material-symbols-outlined text-xl">edit_note</span>
              <span className="text-sm font-medium">Form</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 pb-24">
        <div className="mb-8 text-center">
          <h2 className="text-[#111318] dark:text-white text-2xl font-bold mb-2">
            Teman Cuci Sepatu
          </h2>
          <p className="text-[#616f89] dark:text-gray-400 text-sm">
            Isi data di bawah ini untuk layanan penjemputan gratis ke lokasi Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Nama Lengkap */}
          <div className="flex flex-col gap-2">
            <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full h-12 px-4 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all"
                placeholder="Masukkan nama lengkap anda"
              />
            </div>
          </div>

          {/* Nomor WhatsApp */}
          <div className="flex flex-col gap-2">
            <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
              Nomor WhatsApp <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <PhoneAutocomplete
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="0812xxxx..."
                required
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#616f89] dark:text-gray-500 pointer-events-none">
                <span className="material-symbols-outlined text-xl">call</span>
              </div>
            </div>
          </div>

          {/* Alamat */}
          <div className="flex flex-col gap-2">
            <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
              Alamat Penjemputan{' '}
              <span className="text-[#616f89] font-normal text-xs ml-1">(Opsional)</span>
            </label>
            <div className="relative">
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full min-h-[100px] p-4 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all resize-none"
                placeholder="Jalan Mawar No. 10, Jakarta Selatan..."
              />
              <div className="absolute right-4 top-4 text-[#616f89] dark:text-gray-500 pointer-events-none">
                <span className="material-symbols-outlined text-xl">location_on</span>
              </div>
            </div>
          </div>

          <div className="h-px bg-[#dbdfe6] dark:bg-[#2a3441] w-full my-2"></div>

          {/* Items */}
          {items.map((item, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl bg-white dark:bg-[#1a2230] border border-[#dbdfe6] dark:border-[#2a3441] shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#dbdfe6] dark:border-[#2a3441]">
                <div className="flex items-center gap-2">
                  <div className="bg-[#1152d4]/10 text-[#1152d4] p-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-lg">laundry</span>
                  </div>
                  <h3 className="font-bold text-[#111318] dark:text-white text-sm uppercase tracking-wide">
                    Detail Item {index + 1}
                  </h3>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                )}
              </div>

              {/* Jenis Layanan */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                  Jenis Layanan
                </label>
                <div className="relative">
                  <select
                    required
                    value={item.service}
                    onChange={(e) => updateItem(index, 'service', e.target.value)}
                    className="w-full h-12 pl-4 pr-10 appearance-none rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-[#f6f6f8] dark:bg-[#101622] text-[#111318] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all cursor-pointer"
                  >
                    <option value="" disabled>Pilih layanan...</option>
                    {SERVICE_CATEGORIES.map(category => (
                      <optgroup key={category.name} label={category.name}>
                        {category.services.map(service => (
                          <option key={service.value} value={service.value}>
                            {service.label} - Rp {service.price.toLocaleString('id-ID')}
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

              {/* Jumlah Barang */}
              <div className="flex flex-col gap-2 mb-4">
                <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                  Jumlah Barang
                </label>
                <div className="flex items-center justify-between border border-[#dbdfe6] dark:border-[#2a3441] rounded-xl p-1 bg-[#f6f6f8] dark:bg-[#101622] h-12">
                  <button
                    type="button"
                    onClick={() => decrementQuantity(index)}
                    className="size-10 rounded-lg flex items-center justify-center text-[#616f89] hover:text-[#111318] dark:hover:text-white hover:bg-white dark:hover:bg-[#1a2230] hover:shadow-sm transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">remove</span>
                  </button>
                  <span className="font-bold text-lg text-[#111318] dark:text-white min-w-[32px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => incrementQuantity(index)}
                    className="size-10 rounded-lg flex items-center justify-center text-[#1152d4] hover:text-white bg-white dark:bg-[#1a2230] shadow-sm hover:bg-[#1152d4] transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="flex flex-col gap-2">
                <label className="text-[#111318] dark:text-gray-200 text-sm font-medium">
                  Catatan Tambahan{' '}
                  <span className="text-[#616f89] font-normal text-xs ml-1">(Opsional)</span>
                </label>
                <textarea
                  value={item.notes}
                  onChange={(e) => updateItem(index, 'notes', e.target.value)}
                  className="w-full min-h-[80px] p-3 rounded-xl border border-[#dbdfe6] dark:border-[#2a3441] bg-[#f6f6f8] dark:bg-[#101622] text-[#111318] dark:text-white placeholder:text-[#616f89] dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 focus:border-[#1152d4] transition-all resize-none text-sm"
                  placeholder="Contoh: Noda tinta di bagian samping, tali sepatu diganti, dll..."
                />
              </div>
            </div>
          ))}

          {/* Add Item Button */}
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

          {/* Total Cost */}
          <div className="mt-4 p-5 rounded-2xl bg-[#1152d4]/5 dark:bg-[#1152d4]/20 border border-[#1152d4]/20 flex flex-col items-center justify-center gap-1 text-center shadow-sm">
            <span className="text-[#616f89] dark:text-gray-300 text-sm font-medium uppercase tracking-wide">
              Estimasi Total Biaya ({items.length} item)
            </span>
            <span className="text-[#1152d4] dark:text-blue-400 text-3xl font-extrabold tracking-tight">
              Rp {calculateTotal().toLocaleString('id-ID')}
            </span>
            <p className="text-xs text-[#616f89] dark:text-gray-400 mt-1">
              *Harga final dikonfirmasi saat penjemputan
            </p>
          </div>

          {/* Submit Button */}
          <div className="pb-4">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full h-14 bg-[#1152d4] hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-lg shadow-lg shadow-[#1152d4]/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1152d4]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <span>Kirim Data</span>
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
