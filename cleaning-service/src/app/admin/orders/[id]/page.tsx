'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Order, OrderStatus, CloudinaryImage } from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  formatPhoneNumber, 
  getStatusColor, 
  getStatusLabel,
  generateStatusBasedWhatsAppLink
} from '@/lib/utils';
import { SERVICES } from '@/lib/services';
import { ServiceType } from '@/types';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const notaRef = useRef<HTMLDivElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingNota, setGeneratingNota] = useState(false);

  // Form state
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [notes, setNotes] = useState('');
  const [finalPrice, setFinalPrice] = useState<number | undefined>();
  const [proofOfWork, setProofOfWork] = useState<{ beforePhotos: CloudinaryImage[], afterPhotos: CloudinaryImage[] }>({ beforePhotos: [], afterPhotos: [] });
  const [uploading, setUploading] = useState<'before' | 'after' | null>(null);

  // File upload handler for proof of work images - Uploads to Cloudinary
  const handleImageUpload = async (type: 'before' | 'after', file: File) => {
    if (!orderId) return;
    
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('orderId', orderId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        const newImage: CloudinaryImage = {
          url: result.data.url,
          publicId: result.data.publicId,
        };

        if (type === 'before') {
          setProofOfWork(prev => ({ ...prev, beforePhotos: [newImage] }));
        } else {
          setProofOfWork(prev => ({ ...prev, afterPhotos: [newImage] }));
        }
      } else {
        alert(result.error || 'Gagal upload gambar');
      }
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Gagal upload gambar. Silakan coba lagi.');
    } finally {
      setUploading(null);
    }
  };


  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}`);
      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
        setStatus(result.data.status);
        setNotes(result.data.notes || '');
        setFinalPrice(result.data.finalPrice);
        setProofOfWork(result.data.proofOfWork || { beforePhotos: [], afterPhotos: [] });
      } else {
        setError(result.error || 'Order not found');
      }
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSave = async () => {
    if (!order) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          finalPrice: finalPrice || order.estimatedPrice,
          proofOfWork
        })
      });

      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
        alert('Pesanan berhasil diperbarui!');
      } else {
        alert(result.error || 'Gagal memperbarui pesanan');
      }
    } catch {
      alert('Gagal terhubung ke server');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateNota = async () => {
    if (!notaRef.current || !order) return;

    setGeneratingNota(true);
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Clone the nota element to make it visible for rendering
      const notaElement = notaRef.current;
      const originalStyle = notaElement.getAttribute('style') || '';
      
      // Temporarily make visible for html2canvas
      notaElement.style.cssText = 'position: fixed; left: 0; top: 0; width: 400px; background: white; padding: 24px; font-family: Inter, sans-serif; z-index: 9999;';
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(notaElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 400,
        windowHeight: 600
      });

      // Restore original style
      notaElement.style.cssText = originalStyle || 'position: fixed; left: -9999px;';

      const imageUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `nota-${order.orderNumber}.png`;
      link.href = imageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate nota:', err);
      alert('Gagal membuat nota. Silakan coba lagi.');
    } finally {
      setGeneratingNota(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <span className="material-symbols-outlined text-6xl text-red-400 mb-4">error</span>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-4">{error || 'Order not found'}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-[#1152d4] text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Kembali
        </button>
      </div>
    );
  }

  const statusColor = getStatusColor(order.status);
  const serviceName = SERVICES[order.itemType as ServiceType]?.name || order.itemType;

  return (
    <div className="relative flex flex-col min-h-screen w-full max-w-2xl mx-auto bg-[#f6f6f8] dark:bg-[#101622] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center bg-white dark:bg-[#1a2230] border-b border-gray-200 dark:border-gray-800 p-4 justify-between shadow-sm">
        <button
          onClick={() => router.back()}
          className="text-[#111318] dark:text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
          #{order.orderNumber}
        </h2>
      </div>

      {/* Status Section */}
      <div className="px-4 py-6">
        <label className="flex flex-col w-full">
          <span className="text-[#111318] dark:text-gray-300 text-sm font-semibold uppercase tracking-wide mb-2 ml-1">
            Status Pesanan
          </span>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full appearance-none rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-700 text-[#111318] dark:text-white py-4 px-4 pr-10 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 shadow-sm"
            >
              <option value="pending">Menunggu</option>
              <option value="in_progress">Diproses</option>
              <option value="finished">Selesai</option>
              <option value="delivered">Diantar</option>
              <option value="picked_up">Diambil</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </label>

        {/* Current Status Badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-500">Status saat ini:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="px-4">
        <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
          Info Pelanggan
        </h3>
        <div className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Customer Name */}
          <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="bg-[#1152d4]/10 text-[#1152d4] flex items-center justify-center rounded-full shrink-0 size-14 font-bold text-lg">
              {order.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[#111318] dark:text-white text-base font-semibold leading-normal">{order.name}</p>
              <p className="text-[#616f89] dark:text-gray-400 text-sm font-normal">
                Pesanan: {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          {/* Phone */}
          <a
            href={generateStatusBasedWhatsAppLink(order, proofOfWork.afterPhotos[0]?.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="text-[#1152d4] bg-[#1152d4]/10 flex items-center justify-center rounded-lg shrink-0 size-10">
                <span className="material-symbols-outlined text-[20px]">call</span>
              </div>
              <p className="text-[#111318] dark:text-gray-200 text-base font-medium">{formatPhoneNumber(order.phone)}</p>
            </div>
            <span className="material-symbols-outlined text-gray-400 dark:text-gray-500 group-hover:text-[#25D366]">chat</span>
          </a>

          {/* Address */}
          {order.address && (
            <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="text-[#1152d4] bg-[#1152d4]/10 flex items-center justify-center rounded-lg shrink-0 size-10">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <p className="text-[#111318] dark:text-gray-200 text-base font-medium">{order.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item Details */}
      <div className="px-4 mt-6">
        <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
          Detail Pesanan
        </h3>
        <div className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500">
                <span className="material-symbols-outlined">
                  {SERVICES[order.itemType as ServiceType]?.icon || 'inventory_2'}
                </span>
              </div>
              <div>
                <p className="text-[#111318] dark:text-white font-medium text-base">{serviceName}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {SERVICES[order.itemType as ServiceType]?.nameEn || order.itemType}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[#111318] dark:text-white font-semibold">
                {formatCurrency(SERVICES[order.itemType as ServiceType]?.price || 0)}
              </p>
              <p className="text-gray-500 text-sm">Qty: {order.quantity}</p>
            </div>
          </div>

          {/* Pricing */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Estimasi</span>
              <span>{formatCurrency(order.estimatedPrice)}</span>
            </div>
            
            {/* Final Price Input */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Harga Final</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                <input
                  type="number"
                  value={finalPrice || order.estimatedPrice}
                  onChange={(e) => setFinalPrice(parseInt(e.target.value) || undefined)}
                  className="w-32 pl-9 pr-3 py-2 text-right text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50"
                />
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold text-[#111318] dark:text-[#1152d4] pt-2">
              <span>Total</span>
              <span>{formatCurrency(finalPrice || order.estimatedPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proof of Work */}
      <div className="px-4 mt-6">
        <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
          Bukti Pengerjaan
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Before */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">Sebelum</span>
            {proofOfWork.beforePhotos.length > 0 && proofOfWork.beforePhotos[0]?.url ? (
              <div className="relative aspect-square w-full rounded-xl bg-gray-100 overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src={proofOfWork.beforePhotos[0].url} 
                  alt="Before" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setProofOfWork({ ...proofOfWork, beforePhotos: [] })}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1 text-white backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <label className={`relative aspect-square w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2230] hover:border-[#1152d4] dark:hover:border-[#1152d4] transition-colors flex flex-col items-center justify-center group cursor-pointer ${uploading === 'before' ? 'pointer-events-none opacity-50' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading === 'before'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('before', file);
                  }}
                />
                {uploading === 'before' ? (
                  <>
                    <svg className="animate-spin h-8 w-8 text-[#1152d4] mb-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs text-[#1152d4]">Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1152d4] text-3xl mb-1">add_a_photo</span>
                    <span className="text-xs text-gray-400 group-hover:text-[#1152d4]">Ambil Foto</span>
                  </>
                )}
              </label>
            )}
          </div>

          {/* After */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">Sesudah</span>
            {proofOfWork.afterPhotos.length > 0 && proofOfWork.afterPhotos[0]?.url ? (
              <div className="relative aspect-square w-full rounded-xl bg-gray-100 overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src={proofOfWork.afterPhotos[0].url} 
                  alt="After" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setProofOfWork({ ...proofOfWork, afterPhotos: [] })}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1 text-white backdrop-blur-sm"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            ) : (
              <label className={`relative aspect-square w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2230] hover:border-[#1152d4] dark:hover:border-[#1152d4] transition-colors flex flex-col items-center justify-center group cursor-pointer ${uploading === 'after' ? 'pointer-events-none opacity-50' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading === 'after'}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload('after', file);
                  }}
                />
                {uploading === 'after' ? (
                  <>
                    <svg className="animate-spin h-8 w-8 text-[#1152d4] mb-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-xs text-[#1152d4]">Uploading...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1152d4] text-3xl mb-1">add_a_photo</span>
                    <span className="text-xs text-gray-400 group-hover:text-[#1152d4]">Ambil Foto</span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="px-4 mt-6">
        <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
          Catatan Admin
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full min-h-[120px] rounded-xl bg-white dark:bg-[#1a2230] border border-gray-200 dark:border-gray-700 p-4 text-base text-[#111318] dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50 resize-y"
          placeholder="Masukkan catatan internal tentang pesanan ini..."
        />
      </div>

      {/* Hidden Nota Template - Using inline styles for html2canvas compatibility */}
      <div 
        ref={notaRef} 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          width: '400px', 
          backgroundColor: '#ffffff', 
          padding: '24px',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', borderBottom: '2px dashed #d1d5db', paddingBottom: '16px', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>CUCI PREMIUM</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>Layanan Cuci Profesional</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>WA: 0812-3456-7890</p>
        </div>
        
        <div style={{ fontSize: '14px', marginBottom: '16px', color: '#374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>No. Nota:</span>
            <span>{order.orderNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>Tanggal:</span>
            <span>{formatDate(new Date())}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>Nama:</span>
            <span>{order.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontWeight: '500' }}>HP:</span>
            <span>{formatPhoneNumber(order.phone)}</span>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '12px 0', margin: '12px 0' }}>
          <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#6b7280' }}>
                <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: '500' }}>Item</th>
                <th style={{ textAlign: 'center', fontWeight: '500' }}>Qty</th>
                <th style={{ textAlign: 'right', fontWeight: '500' }}>Harga</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ color: '#1f2937' }}>
                <td style={{ padding: '8px 0' }}>{serviceName}</td>
                <td style={{ textAlign: 'center' }}>{order.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(finalPrice || order.estimatedPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
          <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Total: {formatCurrency(finalPrice || order.estimatedPrice)}
          </p>
        </div>
        
        <div style={{ textAlign: 'center', borderTop: '2px dashed #d1d5db', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Terima kasih telah menggunakan jasa kami!</p>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>Simpan nota ini sebagai bukti pembayaran</p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-4 bg-white/90 dark:bg-[#101622]/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 flex gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleGenerateNota}
          disabled={generatingNota}
          className="flex-1 h-12 rounded-xl bg-[#1152d4]/10 hover:bg-[#1152d4]/20 text-[#1152d4] dark:text-blue-400 font-bold text-base transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generatingNota ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <span className="material-symbols-outlined">receipt_long</span>
          )}
          Buat Nota
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-12 rounded-xl bg-[#1152d4] hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <span className="material-symbols-outlined">save</span>
          )}
          Simpan
        </button>
      </div>
    </div>
  );
}
