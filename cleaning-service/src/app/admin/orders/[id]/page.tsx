'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Order, OrderStatus, CloudinaryImage } from '@/types';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTimeFull,
  formatPhoneNumber, 
  getStatusColor, 
  getStatusLabel,
  generateStatusBasedWhatsAppLink
} from '@/lib/utils';
import { SERVICES } from '@/lib/services';
import { ServiceType } from '@/types';

// Fullscreen Image Viewer Modal with Pinch-to-Zoom
interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageAlt: string;
  onClose: () => void;
}

function ImageViewerModal({ isOpen, imageUrl, imageAlt, onClose }: ImageViewerModalProps) {
  const [zoomState, setZoomState] = useState({ scale: 1, x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartRef = useRef<{ distance: number; scale: number; x: number; y: number; touches: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number; isDown: boolean } | null>(null);
  const lastTapRef = useRef<number>(0);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoomState({ scale: 1, x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Helper: Calculate distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Clamp scale between 1.0 and 3.0
  const clampScale = (scale: number) => Math.max(1, Math.min(3, scale));

  // Reset zoom
  const resetZoom = () => {
    setIsTransitioning(true);
    setZoomState({ scale: 1, x: 0, y: 0 });
    setTimeout(() => setIsTransitioning(false), 150);
  };

  // Touch Start Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      touchStartRef.current = {
        distance,
        scale: zoomState.scale,
        x: zoomState.x,
        y: zoomState.y,
        touches: 2,
      };
    } else if (e.touches.length === 1 && zoomState.scale > 1) {
      touchStartRef.current = {
        distance: 0,
        scale: zoomState.scale,
        x: e.touches[0].clientX - zoomState.x,
        y: e.touches[0].clientY - zoomState.y,
        touches: 1,
      };
    }
  };

  // Touch Move Handler
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2 && touchStartRef.current.touches === 2) {
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scaleRatio = currentDistance / touchStartRef.current.distance;
      const newScale = clampScale(touchStartRef.current.scale * scaleRatio);
      
      setZoomState(prev => ({
        ...prev,
        scale: newScale,
      }));
    } else if (e.touches.length === 1 && touchStartRef.current.touches === 1 && zoomState.scale > 1) {
      e.preventDefault();
      const newX = e.touches[0].clientX - touchStartRef.current.x;
      const newY = e.touches[0].clientY - touchStartRef.current.y;
      
      setZoomState(prev => ({
        ...prev,
        x: newX,
        y: newY,
      }));
    }
  };

  // Touch End Handler
  const handleTouchEnd = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && zoomState.scale <= 1) {
      // Double-tap when not zoomed = close modal
      onClose();
    }
    lastTapRef.current = now;

    if (zoomState.scale <= 1) {
      resetZoom();
    }

    touchStartRef.current = null;
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomState.scale > 1) {
      e.preventDefault();
      mouseStartRef.current = {
        x: e.clientX - zoomState.x,
        y: e.clientY - zoomState.y,
        isDown: true,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mouseStartRef.current?.isDown || zoomState.scale <= 1) return;
    
    e.preventDefault();
    const newX = e.clientX - mouseStartRef.current.x;
    const newY = e.clientY - mouseStartRef.current.y;
    
    setZoomState(prev => ({
      ...prev,
      x: newX,
      y: newY,
    }));
  };

  const handleMouseUp = () => {
    if (mouseStartRef.current) {
      mouseStartRef.current.isDown = false;
    }
  };

  const handleDoubleClick = () => {
    if (zoomState.scale > 1) {
      resetZoom();
    } else {
      setIsTransitioning(true);
      setZoomState({ scale: 2, x: 0, y: 0 });
      setTimeout(() => setIsTransitioning(false), 150);
    }
  };

  // Click outside image to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && zoomState.scale <= 1) {
      onClose();
    }
  };

  const getCursor = () => {
    if (zoomState.scale > 1) {
      return mouseStartRef.current?.isDown ? 'grabbing' : 'grab';
    }
    return 'zoom-in';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={handleBackdropClick}
      style={{ touchAction: 'none' }}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white transition-colors"
        aria-label="Close"
      >
        <span className="material-symbols-outlined text-2xl">close</span>
      </button>

      {/* Image Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={imageAlt}
          draggable={false}
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`,
            transition: isTransitioning ? 'transform 0.15s ease-out' : 'none',
            cursor: getCursor(),
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
          }}
        />
      </div>

      {/* Zoom Indicator */}
      {zoomState.scale > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm font-medium">
          {(zoomState.scale * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

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
  const [uploadProgress, setUploadProgress] = useState<{ type: 'before' | 'after', current: number, total: number } | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Image viewer modal state
  const [viewerState, setViewerState] = useState<{ isOpen: boolean; imageUrl: string; imageAlt: string }>({
    isOpen: false,
    imageUrl: '',
    imageAlt: '',
  });

  // Open image in fullscreen viewer
  const openImageViewer = (url: string, alt: string) => {
    setViewerState({ isOpen: true, imageUrl: url, imageAlt: alt });
  };

  // Close image viewer
  const closeImageViewer = () => {
    setViewerState({ isOpen: false, imageUrl: '', imageAlt: '' });
  };

  // Multi-file upload handler with optimistic UI
  const handleMultipleImageUpload = async (type: 'before' | 'after', files: FileList | File[]) => {
    if (!orderId) return;
    
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(type);
    setUploadProgress({ type, current: 0, total: fileArray.length });

    const successfulUploads: CloudinaryImage[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      try {
        // Optimistic UI - create temporary placeholder
        const tempId = `temp-${Date.now()}-${i}`;
        const tempImage: CloudinaryImage = {
          url: URL.createObjectURL(file),
          publicId: tempId,
        };

        // Add optimistic image
        if (type === 'before') {
          setProofOfWork(prev => ({ ...prev, beforePhotos: [...prev.beforePhotos, tempImage] }));
        } else {
          setProofOfWork(prev => ({ ...prev, afterPhotos: [...prev.afterPhotos, tempImage] }));
        }

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
          const realImage: CloudinaryImage = {
            url: result.data.url,
            publicId: result.data.publicId,
          };

          // Replace temp with real image
          if (type === 'before') {
            setProofOfWork(prev => ({
              ...prev,
              beforePhotos: prev.beforePhotos.map(img => 
                img.publicId === tempId ? realImage : img
              )
            }));
          } else {
            setProofOfWork(prev => ({
              ...prev,
              afterPhotos: prev.afterPhotos.map(img => 
                img.publicId === tempId ? realImage : img
              )
            }));
          }

          successfulUploads.push(realImage);
        } else {
          // Remove failed temp image
          if (type === 'before') {
            setProofOfWork(prev => ({
              ...prev,
              beforePhotos: prev.beforePhotos.filter(img => img.publicId !== tempId)
            }));
          } else {
            setProofOfWork(prev => ({
              ...prev,
              afterPhotos: prev.afterPhotos.filter(img => img.publicId !== tempId)
            }));
          }
          failedUploads.push(file.name);
        }
      } catch (err) {
        console.error('Failed to upload image:', err);
        failedUploads.push(file.name);
      }

      setUploadProgress({ type, current: i + 1, total: fileArray.length });
    }

    setUploading(null);
    setUploadProgress(null);

    if (failedUploads.length > 0) {
      alert(`Gagal upload ${failedUploads.length} foto: ${failedUploads.join(', ')}`);
    }
  };

  // Delete individual photo with optimistic UI and rollback
  const handleDeletePhoto = async (type: 'before' | 'after', publicId: string) => {
    if (!orderId || !publicId) return;

    const confirmed = confirm('Hapus foto ini? Foto akan dihapus dari Cloudinary dan database.');
    if (!confirmed) return;

    setDeletingPhoto(publicId);

    // Optimistic UI - remove immediately
    const backup = type === 'before' ? [...proofOfWork.beforePhotos] : [...proofOfWork.afterPhotos];
    
    if (type === 'before') {
      setProofOfWork(prev => ({
        ...prev,
        beforePhotos: prev.beforePhotos.filter(img => img.publicId !== publicId)
      }));
    } else {
      setProofOfWork(prev => ({
        ...prev,
        afterPhotos: prev.afterPhotos.filter(img => img.publicId !== publicId)
      }));
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/photos?publicId=${encodeURIComponent(publicId)}&type=${type}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!result.success) {
        // Rollback on error
        if (type === 'before') {
          setProofOfWork(prev => ({ ...prev, beforePhotos: backup }));
        } else {
          setProofOfWork(prev => ({ ...prev, afterPhotos: backup }));
        }
        alert(result.error || 'Gagal hapus foto');
      }
    } catch (err) {
      console.error('Failed to delete photo:', err);
      // Rollback on error
      if (type === 'before') {
        setProofOfWork(prev => ({ ...prev, beforePhotos: backup }));
      } else {
        setProofOfWork(prev => ({ ...prev, afterPhotos: backup }));
      }
      alert('Gagal hapus foto. Silakan coba lagi.');
    } finally {
      setDeletingPhoto(null);
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
        
        // Load discount data
        if (result.data.discount) {
          setDiscountType(result.data.discount.type);
          setDiscountValue(result.data.discount.value);
        } else {
          setDiscountType('percentage');
          setDiscountValue(0);
        }
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
      const cleanProofOfWork = {
        beforePhotos: proofOfWork.beforePhotos.filter(p => !p.publicId.startsWith('temp-')),
        afterPhotos: proofOfWork.afterPhotos.filter(p => !p.publicId.startsWith('temp-'))
      };

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          finalPrice: finalPrice || order.estimatedPrice,
          proofOfWork: cleanProofOfWork
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

      // Download to device gallery
      const link = document.createElement('a');
      link.download = `nota-${order.orderNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert('Nota berhasil disimpan ke galeri!');
    } catch (err) {
      console.error('Failed to generate nota:', err);
      alert('Gagal membuat nota. Silakan coba lagi.');
    } finally {
      setGeneratingNota(false);
    }
  };

  // Apply discount
  const handleApplyDiscount = async () => {
    if (!order) return;

    setApplyingDiscount(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount: {
            type: discountType,
            value: discountValue
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
        setFinalPrice(result.data.finalPrice);
        alert('Diskon berhasil diterapkan!');
      } else {
        alert(result.error || 'Gagal menerapkan diskon');
      }
    } catch {
      alert('Gagal terhubung ke server');
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Remove discount
  const handleRemoveDiscount = async () => {
    if (!order) return;

    const confirmed = confirm('Hapus diskon dari pesanan ini?');
    if (!confirmed) return;

    // Optimistically clear discount UI immediately
    const originalOrder = { ...order };
    const subtotal = (order.items && order.items.length > 0)
      ? order.items.reduce((sum, item) => sum + item.subtotal, 0)
      : (order.estimatedPrice || 0);
    
    const clearedOrder: Order = {
      ...order,
      discount: undefined,
      subtotal: subtotal,
      finalPrice: subtotal
    };
    
    setOrder(clearedOrder);
    setFinalPrice(subtotal);
    setDiscountType('percentage');
    setDiscountValue(0);
    setApplyingDiscount(true);

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount: null
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update with server response
        setOrder(result.data);
        setFinalPrice(result.data.finalPrice || result.data.estimatedPrice);
        alert('Diskon berhasil dihapus!');
      } else {
        // Rollback on error
        setOrder(originalOrder);
        setFinalPrice(originalOrder.finalPrice);
        if (originalOrder.discount) {
          setDiscountType(originalOrder.discount.type);
          setDiscountValue(originalOrder.discount.value);
        }
        alert(result.error || 'Gagal menghapus diskon');
      }
    } catch {
      // Rollback on error
      setOrder(originalOrder);
      setFinalPrice(originalOrder.finalPrice);
      if (originalOrder.discount) {
        setDiscountType(originalOrder.discount.type);
        setDiscountValue(originalOrder.discount.value);
      }
      alert('Gagal terhubung ke server');
    } finally {
      setApplyingDiscount(false);
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
              <option value="finished">Selesai</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <span className="material-symbols-outlined">expand_more</span>
            </div>
          </div>
        </label>

        {/* Current Status Badge */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Status saat ini:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {getStatusLabel(order.status)}
          </span>
          {order.status === 'finished' && order.finishedAt && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              · Selesai {formatDateTimeFull(order.finishedAt)}
            </span>
          )}
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
            href={generateStatusBasedWhatsAppLink(order)}
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
          {/* Check if order has items array (multi-item) or legacy single item */}
          {order.items && order.items.length > 0 ? (
            // Multi-item display
            <div className="space-y-4">
              {order.items.map((item, index) => {
                const service = SERVICES[item.serviceType];
                return (
                  <div key={item.id || index} className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <div className="flex gap-3 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 shrink-0">
                        <span className="material-symbols-outlined">
                          {service?.icon || 'inventory_2'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-[#111318] dark:text-white font-medium text-base">
                          {service?.name || item.customItemType || item.serviceType}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {service?.nameEn || item.serviceType}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-[#111318] dark:text-white font-semibold">
                        {formatCurrency(item.subtotal)}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatCurrency(item.unitPrice)} x {item.quantity}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Legacy single item display
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
          )}

          {/* Pricing */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-300 dark:border-gray-600 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal || order.estimatedPrice || 0)}</span>
            </div>
            
            {/* Show discount if applied */}
            {order.discount && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>
                  Diskon {order.discount.type === 'percentage' ? `(${order.discount.value}%)` : ''}
                </span>
                <span>
                  - {formatCurrency(
                    order.discount.type === 'percentage' 
                      ? Math.round((order.subtotal || order.estimatedPrice || 0) * order.discount.value / 100)
                      : order.discount.value
                  )}
                </span>
              </div>
            )}

            <div className="flex justify-between text-lg font-bold text-[#111318] dark:text-[#1152d4] pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Total Bayar</span>
              <span>{formatCurrency(order.finalPrice || order.subtotal || order.estimatedPrice || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Discount Section */}
      <div className="px-4 mt-6">
        <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
          Diskon
        </h3>
        <div className="bg-white dark:bg-[#1a2230] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 space-y-4">
          {/* Discount Type Toggle */}
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
              Tipe Diskon
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setDiscountType('percentage')}
                disabled={applyingDiscount}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-medium text-sm transition-all ${
                  discountType === 'percentage'
                    ? 'border-[#1152d4] bg-[#1152d4]/10 text-[#1152d4]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                Persen (%)
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                disabled={applyingDiscount}
                className={`flex-1 py-2.5 px-4 rounded-lg border-2 font-medium text-sm transition-all ${
                  discountType === 'fixed'
                    ? 'border-[#1152d4] bg-[#1152d4]/10 text-[#1152d4]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}
              >
                Nominal (Rp)
              </button>
            </div>
          </div>

          {/* Discount Value Input */}
          <div>
            <label className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 block">
              Nilai Diskon
            </label>
            <div className="relative">
              {discountType === 'fixed' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">Rp</span>
              )}
              <input
                type="number"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                disabled={applyingDiscount}
                min="0"
                max={discountType === 'percentage' ? 100 : undefined}
                placeholder={discountType === 'percentage' ? '0-100' : '0'}
                className={`w-full ${discountType === 'fixed' ? 'pl-9' : 'pl-4'} pr-12 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a2230] text-[#111318] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1152d4]/50`}
              />
              {discountType === 'percentage' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleApplyDiscount}
              disabled={applyingDiscount || discountValue <= 0}
              className="flex-1 py-2.5 px-4 bg-[#1152d4] hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {applyingDiscount ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Menerapkan...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]"></span>
                  <span>Terapkan Diskon</span>
                </>
              )}
            </button>
            
            {order?.discount && (
              <button
                onClick={handleRemoveDiscount}
                disabled={applyingDiscount}
                className="py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Hapus</span>
              </button>
            )}
          </div>

          {/* Current Discount Info */}
          {order?.discount && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">check_circle</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">
                    Diskon Aktif
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    {order.discount.type === 'percentage' 
                      ? `${order.discount.value}% dari subtotal`
                      : `Potongan ${formatCurrency(order.discount.value)}`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Notes */}
      {order.customerNotes && (
        <div className="px-4 mt-6">
          <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
            Catatan Customer
          </h3>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center rounded-lg shrink-0 size-10">
                <span className="material-symbols-outlined text-[20px]">sticky_note_2</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
                  Catatan dari customer:
                </p>
                <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap break-words">
                  {order.customerNotes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof of Work */}
      <div className="px-4 mt-6">
        <h3 className="text-[#111318] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-3">
          Bukti Pengerjaan
        </h3>
        
        {/* Before Photos */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 ml-1 uppercase tracking-wider">Sebelum</span>
            {uploadProgress?.type === 'before' && (
              <span className="text-xs text-[#1152d4]">
                {uploadProgress.current}/{uploadProgress.total}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
            {/* Existing Before Photos */}
            {proofOfWork.beforePhotos.map((photo, index) => (
              <div key={photo.publicId} className="relative aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm group">
                <button
                  onClick={() => openImageViewer(photo.url, `Before ${index + 1}`)}
                  disabled={photo.publicId.startsWith('temp-')}
                  className="w-full h-full relative"
                >
                  <img
                    src={photo.url}
                    alt={`Before ${index + 1}`}
                    className={`w-full h-full object-cover ${deletingPhoto === photo.publicId ? 'opacity-50' : ''} ${!photo.publicId.startsWith('temp-') ? 'group-hover:brightness-75 transition-all cursor-pointer' : ''}`}
                  />
                  {!photo.publicId.startsWith('temp-') && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                      <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
                    </div>
                  )}
                </button>
                {!photo.publicId.startsWith('temp-') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto('before', photo.publicId);
                    }}
                    disabled={deletingPhoto === photo.publicId}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white backdrop-blur-sm transition-colors disabled:opacity-50 z-10"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                {photo.publicId.startsWith('temp-') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 pointer-events-none">
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            
            {/* Add Photo Button */}
            <label className={`relative aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2230] hover:border-[#1152d4] dark:hover:border-[#1152d4] transition-colors flex flex-col items-center justify-center group cursor-pointer ${uploading === 'before' ? 'pointer-events-none opacity-50' : ''}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading === 'before'}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleMultipleImageUpload('before', files);
                  }
                  e.target.value = '';
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
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1152d4] text-2xl mb-1">
                    {proofOfWork.beforePhotos.length === 0 ? 'add_a_photo' : 'add'}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-[#1152d4]">
                    {proofOfWork.beforePhotos.length === 0 ? 'Foto' : 'Tambah'}
                  </span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* After Photos */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 ml-1 uppercase tracking-wider">Sesudah</span>
            {uploadProgress?.type === 'after' && (
              <span className="text-xs text-[#1152d4]">
                {uploadProgress.current}/{uploadProgress.total}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1">
            {/* Existing After Photos */}
            {proofOfWork.afterPhotos.map((photo, index) => (
              <div key={photo.publicId} className="relative aspect-square rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm group">
                <button
                  onClick={() => openImageViewer(photo.url, `After ${index + 1}`)}
                  disabled={photo.publicId.startsWith('temp-')}
                  className="w-full h-full relative"
                >
                  <img
                    src={photo.url}
                    alt={`After ${index + 1}`}
                    className={`w-full h-full object-cover ${deletingPhoto === photo.publicId ? 'opacity-50' : ''} ${!photo.publicId.startsWith('temp-') ? 'group-hover:brightness-75 transition-all cursor-pointer' : ''}`}
                  />
                  {!photo.publicId.startsWith('temp-') && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 pointer-events-none">
                      <span className="material-symbols-outlined text-white text-3xl">zoom_in</span>
                    </div>
                  )}
                </button>
                {!photo.publicId.startsWith('temp-') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto('after', photo.publicId);
                    }}
                    disabled={deletingPhoto === photo.publicId}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white backdrop-blur-sm transition-colors disabled:opacity-50 z-10"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
                {photo.publicId.startsWith('temp-') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10 pointer-events-none">
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            
            {/* Add Photo Button */}
            <label className={`relative aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a2230] hover:border-[#1152d4] dark:hover:border-[#1152d4] transition-colors flex flex-col items-center justify-center group cursor-pointer ${uploading === 'after' ? 'pointer-events-none opacity-50' : ''}`}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={uploading === 'after'}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleMultipleImageUpload('after', files);
                  }
                  e.target.value = '';
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
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-[#1152d4] text-2xl mb-1">
                    {proofOfWork.afterPhotos.length === 0 ? 'add_a_photo' : 'add'}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-[#1152d4]">
                    {proofOfWork.afterPhotos.length === 0 ? 'Foto' : 'Tambah'}
                  </span>
                </>
              )}
            </label>
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
        {/* Background Logo Image */}
        <img 
          src="https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/v1768543427/logo_tcs_keooto.png"
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.08,
            filter: 'blur(3px)',
            width: '280px',
            height: 'auto',
            zIndex: 0,
            pointerEvents: 'none'
          }}
        />
        
        {/* Content with relative positioning */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', borderBottom: '2px dashed #d1d5db', paddingBottom: '16px', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>TEMAN CUCI SEPATU</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px', marginBottom: 0 }}>Solusi Sepatu Kotor dan Bau</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', marginBottom: 0, lineHeight: '1.4' }}>Teman Cuci Sepatu, Jl. Keputih Tegal No.36C, Keputih, Kec. Sukolilo, Surabaya, Jawa Timur 60111</p>
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
              <span style={{ fontWeight: '500' }}>Jam:</span>
              <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: '500' }}>Nama:</span>
              <span>{order.name}</span>
            </div>
          </div>
        
          <div style={{ borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb', padding: '12px 0', margin: '12px 0' }}>
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#6b7280' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0', fontWeight: '500' }}>Item</th>
                  <th style={{ textAlign: 'center', fontWeight: '500' }}>Qty</th>
                  <th style={{ textAlign: 'right', fontWeight: '500' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items && order.items.length > 0 ? (
                  // Multi-item order - show all items
                  order.items.map((item, index) => {
                    const service = SERVICES[item.serviceType];
                    return (
                      <tr key={index} style={{ color: '#1f2937' }}>
                        <td style={{ padding: '8px 0', borderBottom: index < order.items!.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          {service?.name || item.customItemType || item.serviceType}
                        </td>
                        <td style={{ textAlign: 'center', borderBottom: index < order.items!.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          {item.quantity}
                        </td>
                        <td style={{ textAlign: 'right', borderBottom: index < order.items!.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  // Legacy single item order
                  <tr style={{ color: '#1f2937' }}>
                    <td style={{ padding: '8px 0' }}>{serviceName}</td>
                    <td style={{ textAlign: 'center' }}>{order.quantity || 1}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency((order.subtotal || order.estimatedPrice || 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: '16px', marginBottom: '24px', fontSize: '14px', color: '#374151' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px' }}>
              <span style={{ fontWeight: '500' }}>Jumlah Pembelian</span>
              <span style={{ fontWeight: '600' }}>{formatCurrency(order.subtotal || order.estimatedPrice || 0)}</span>
            </div>
            
            {order.discount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '8px', color: '#059669' }}>
                <span style={{ fontWeight: '500' }}>
                  Diskon {order.discount.type === 'percentage' ? `(${order.discount.value}%)` : ''}
                </span>
                <span style={{ fontWeight: '600' }}>
                  - {formatCurrency(
                    order.discount.type === 'percentage' 
                      ? Math.round((order.subtotal || order.estimatedPrice || 0) * order.discount.value / 100)
                      : order.discount.value
                  )}
                </span>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '2px solid #e5e7eb' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Total Pembayaran</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                {formatCurrency(order.finalPrice || order.subtotal || order.estimatedPrice || 0)}
              </span>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', borderTop: '2px dashed #d1d5db', paddingTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Terima kasih telah menggunakan jasa kami!</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px', marginBottom: 0 }}>Simpan nota ini sebagai bukti pembayaran</p>
          </div>
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
          disabled={uploading !== null || saving}
          className="flex-1 h-12 rounded-xl bg-[#1152d4] hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {uploading !== null ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Uploading photos...</span>
            </>
          ) : saving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              Simpan
            </>
          )}
        </button>
      </div>

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={viewerState.isOpen}
        imageUrl={viewerState.imageUrl}
        imageAlt={viewerState.imageAlt}
        onClose={closeImageViewer}
      />
    </div>
  );
}
