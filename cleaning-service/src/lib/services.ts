// ============================================
// SERVICE CONFIGURATION
// Price in IDR (Indonesian Rupiah)
// ============================================

import { ServiceConfig, ServiceType } from '@/types';

export const SERVICES: Record<ServiceType, ServiceConfig> = {
  // Cleaning - Normal
  Deepclean: {
    name: 'Deepclean',
    nameEn: 'Deepclean',
    price: 35000,
    icon: 'steps'
  },
  sandal: {
    name: 'Sandal',
    nameEn: 'Sandals',
    price: 25000,
    icon: 'footprint'
  },
  tas_ransel: {
    name: 'Tas Ransel',
    nameEn: 'Backpack',
    price: 40000,
    icon: 'backpack'
  },
  tas_gunung: {
    name: 'Tas Gunung',
    nameEn: 'Mountain Bag',
    price: 50000,
    icon: 'hiking'
  },
  topi: {
    name: 'Topi',
    nameEn: 'Hat',
    price: 25000,
    icon: 'school'
  },
  helm: {
    name: 'Helm',
    nameEn: 'Helmet',
    price: 30000,
    icon: 'sports_motorsports'
  },
  one_day_service: {
    name: 'One Day Service',
    nameEn: 'One Day Service',
    price: 50000,
    icon: 'bolt'
  },
  // Treatment
  unyellowing: {
    name: 'Unyellowing',
    nameEn: 'Unyellowing',
    price: 50000,
    icon: 'wb_sunny'
  },
  whitening: {
    name: 'Whitening',
    nameEn: 'Whitening',
    price: 50000,
    icon: 'auto_fix_high'
  },
  sewing: {
    name: 'Sewing (Jahit)',
    nameEn: 'Sewing',
    price: 35000,
    icon: 'content_cut'
  },
  // Repaint
  repaint_canvas: {
    name: 'Repaint Canvas',
    nameEn: 'Canvas Repaint',
    price: 75000,
    icon: 'brush'
  },
  repaint_leather: {
    name: 'Repaint Leather',
    nameEn: 'Leather Repaint',
    price: 75000,
    icon: 'format_paint'
  },
  repaint_suede: {
    name: 'Repaint Suede',
    nameEn: 'Suede Repaint',
    price: 75000,
    icon: 'palette'
  },
  // Other
  other: {
    name: 'Lainnya',
    nameEn: 'Other',
    price: 0,
    icon: 'more_horiz'
  }
};

// Service categories for grouped dropdown
export const SERVICE_CATEGORIES = [
  {
    name: 'Cleaning',
    services: [
      { value: 'Deepclean', label: 'Deepclean', price: 35000 },
      { value: 'sandal', label: 'Sandal', price: 25000 },
      { value: 'tas_ransel', label: 'Tas Ransel', price: 40000 },
      { value: 'tas_gunung', label: 'Tas Gunung', price: 50000 },
      { value: 'topi', label: 'Topi', price: 25000 },
      { value: 'helm', label: 'Helm', price: 30000 },
      { value: 'one_day_service', label: 'One Day Service', price: 50000 }
    ]
  },
  {
    name: 'Treatment',
    services: [
      { value: 'unyellowing', label: 'Unyellowing', price: 50000 },
      { value: 'whitening', label: 'Whitening', price: 50000 },
      { value: 'sewing', label: 'Sewing (Jahit)', price: 35000 }
    ]
  },
  {
    name: 'Repaint',
    services: [
      { value: 'repaint_canvas', label: 'Repaint Canvas', price: 75000 },
      { value: 'repaint_leather', label: 'Repaint Leather', price: 75000 },
      { value: 'repaint_suede', label: 'Repaint Suede', price: 75000 }
    ]
  },
  {
    name: 'Lainnya',
    services: [
      { value: 'other', label: 'Lainnya', price: 0 }
    ]
  }
];

// Service type options for dropdown (flat list)
export const SERVICE_OPTIONS = Object.entries(SERVICES).map(([key, value]) => ({
  value: key as ServiceType,
  label: value.name,
  price: value.price
}));

// Color mapping for charts
export const SERVICE_COLORS: Record<ServiceType, string> = {
  Deepclean: '#1152d4',
  sandal: '#3B82F6',
  tas_ransel: '#10B981',
  tas_gunung: '#059669',
  topi: '#F59E0B',
  helm: '#D97706',
  one_day_service: '#EF4444',
  unyellowing: '#8B5CF6',
  whitening: '#A855F7',
  sewing: '#EC4899',
  repaint_canvas: '#14B8A6',
  repaint_leather: '#06B6D4',
  repaint_suede: '#0EA5E9',
  other: '#6B7280'
};

// Business Info
export const BUSINESS_INFO = {
  name: 'Cuci Premium',
  tagline: 'Layanan Cuci Premium',
  address: 'Jl. Contoh No. 123, Jakarta',
  phone: '081234567890', // Replace with actual phone
  whatsapp: '6281234567890' // Replace with actual WhatsApp (with country code)
};

// ============================================
// PRICING INTERFACES & HELPERS
// ============================================

export type ServiceKey = ServiceType;

export interface ServiceSelection {
  serviceKey: ServiceKey;
  quantity: number;
  price: number; // Price at time of order
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  total: number;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
}

/**
 * Calculate subtotal from service selections
 */
export function calculateSubtotal(items: ServiceSelection[]): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Calculate total with optional discount
 * @param items - Array of service selections with price and quantity
 * @param discount - Optional discount object with type and value
 * @returns PricingResult with subtotal, discountAmount, and total
 */
export function calculateTotal(items: ServiceSelection[], discount?: Discount | null): PricingResult {
  const subtotal = calculateSubtotal(items);
  let discountAmount = 0;

  if (discount) {
    if (discount.type === 'percentage') {
      // Percentage discount (0-100)
      const percentage = Math.max(0, Math.min(100, discount.value));
      discountAmount = Math.round((subtotal * percentage) / 100);
    } else if (discount.type === 'fixed') {
      // Fixed amount discount
      discountAmount = Math.max(0, discount.value);
    }
  }

  // Ensure total never goes below 0
  const total = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountAmount,
    total,
  };
}

/**
 * Format amount to Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
