// ============================================
// UTILITY FUNCTIONS
// ============================================

import { Order } from '@/types';

/**
 * Format number to Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format number without currency symbol
 */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID').format(amount);
}

/**
 * Generate WhatsApp link with pre-filled message
 */
export function generateWhatsAppLink(phone: string, message?: string): string {
  // Clean phone number
  let cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Handle Indonesian format
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '62' + cleanPhone.slice(1);
  }
  
  // Remove leading + if present
  cleanPhone = cleanPhone.replace(/^\+/, '');
  
  const baseUrl = `https://wa.me/${cleanPhone}`;
  
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  
  return baseUrl;
}

/**
 * WhatsApp message templates
 */
export const WA_TEMPLATES = {
  newOrderVerification: (order: Order) =>
    `Halo ${order.name}, terima kasih telah menghubungi Teman Cuci Sepatu.\n\nPesanan Anda:\n- Jenis: ${order.itemType}\n- Qty: ${order.quantity || 1}\n- Estimasi: ${formatCurrency(order.estimatedPrice || 0)}\n\nApakah data sudah benar?`,

  orderInProgress: (order: Order) =>
    `Halo Kak ${order.name},\nTerima kasih sudah mempercayakan perawatan Deepclean ke *Teman Cuci Sepatu*.\n\nSaat ini Deepclean Kakak sudah kami terima dan sedang *dalam antrean proses* ya.\nEstimasi pengerjaan sekitar *2-3 hari kerja*, agar hasilnya bisa maksimal dan rapi.\n\nKami akan mengabari Kakak kembali segera setelah proses selesai.\nTerima kasih atas kesabarannya.`,

  orderCompleted: (order: Order) =>
    `Halo Kak ${order.name},\nKabar baik dari *Teman Cuci Sepatu*!\n\nDeepclean Kakak sudah *selesai kami kerjakan* dan siap untuk diambil / dikirim.\n\nTotal Biaya: *Rp ${formatNumber(order.finalPrice || order.estimatedPrice || 0)}*\n\nSilakan info ke kami ya Kak untuk jadwal pengambilan atau pengantaran.\nTerima kasih sudah mempercayakan Deepclean Kakak ke *Teman Cuci Sepatu*.`
};

/**
 * Get WhatsApp message based on order status
 */
export function getWhatsAppMessageByStatus(order: Order): string {
  switch (order.status) {
    case 'in_progress':
      return WA_TEMPLATES.orderInProgress(order);
    case 'finished':
      return WA_TEMPLATES.orderCompleted(order);
    default:
      return WA_TEMPLATES.orderInProgress(order);
  }
}

/**
 * Generate WhatsApp link based on order status
 */
export function generateStatusBasedWhatsAppLink(order: Order): string {
  const message = getWhatsAppMessageByStatus(order);
  return generateWhatsAppLink(order.phone, message);
}

/**
 * Validate Indonesian phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  // Indonesian phone: starts with 08, +62, or 62
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{7,11}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Convert to local format
  let localPhone = cleanPhone;
  if (localPhone.startsWith('62')) {
    localPhone = '0' + localPhone.slice(2);
  } else if (localPhone.startsWith('+62')) {
    localPhone = '0' + localPhone.slice(3);
  }
  
  // Format: 0812-3456-7890
  if (localPhone.length >= 10) {
    return `${localPhone.slice(0, 4)}-${localPhone.slice(4, 8)}-${localPhone.slice(8)}`;
  }
  
  return localPhone;
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  
  return targetDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Get current date/time in WIB timezone (GMT+7)
 * Use this instead of new Date() for Indonesian time
 */
export function getWIBDate(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = utcTime + (7 * 3600 * 1000);
  return new Date(wibTime);
}

/**
 * Format date in GMT+7 timezone
 */
export function formatDateGMT7(date: Date | string): string {
  const dateObj = new Date(date);
  const utcTime = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const gmt7Time = utcTime + (7 * 3600 * 1000);
  const gmt7Date = new Date(gmt7Time);
  return gmt7Date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-400'
      };
    case 'in_progress':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-400'
      };
    case 'finished':
      return {
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-500'
      };
    case 'delivered':
      return {
        bg: 'bg-purple-100 dark:bg-purple-900/30',
        text: 'text-purple-800 dark:text-purple-300',
        border: 'border-purple-500'
      };
    case 'picked_up':
      return {
        bg: 'bg-gray-200 dark:bg-gray-700',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-500'
      };
    case 'unverified':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-800 dark:text-orange-300',
        border: 'border-orange-400'
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-400'
      };
  }
}

/**
 * Get status label in Indonesian
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Menunggu';
    case 'in_progress':
      return 'Diproses';
    case 'finished':
      return 'Selesai';
    case 'delivered':
      return 'Diantar';
    case 'picked_up':
      return 'Diambil';
    case 'unverified':
      return 'Belum Verifikasi';
    case 'approved':
      return 'Terverifikasi';
    case 'rejected':
      return 'Ditolak';
    default:
      return status;
  }
}

/**
 * Get avatar background color based on name
 */
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-orange-100 text-orange-600',
    'bg-emerald-100 text-emerald-600',
    'bg-pink-100 text-pink-600',
    'bg-cyan-100 text-cyan-600'
  ];
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
