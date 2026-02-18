// ============================================
// SERVICE CONFIGURATION
// Price in IDR (Indonesian Rupiah)
// ============================================

import { ServiceConfig, ServiceType } from '@/types';

export const SERVICES: Record<ServiceType, ServiceConfig> = {
  Deepclean: {
    name: 'Deepclean',
    nameEn: 'Deepclean',
    price: 35000,
    icon: 'steps'
  },
  Deepclean_Sandal: {
    name: 'Deepclean Sandal',
    nameEn: 'Deepclean Sandal',
    price: 25000,
    icon: 'backpack'
  },
  Deepclean_Tas: {
    name: 'Deepclean Tas',
    nameEn: 'Deepclean Bag',
    price: 45000,
    icon: 'backpack'
  },
  deepclean_bag_small: {
    name: 'Deepclean Tas Kecil',
    nameEn: 'Deepclean Bag (Small)',
    price: 35000,
    icon: 'work'
  },
  deepclean_bag_large: {
    name: 'Deepclean Tas Besar',
    nameEn: 'Deepclean Bag (Large)',
    price: 55000,
    icon: 'shopping_bag'
  },
  tas_gunung: {
    name: 'Tas Gunung',
    nameEn: 'Mountain Bag',
    price: 50000,
    icon: 'hiking'
  },
  Deepclean_Sandal: {
    name: 'Deepclean Sandal',
    nameEn: 'Deepclean Sandal',
    price: 25000,
    icon: 'backpack'
  },
  Deepclean_Tas: {
    name: 'Deepclean Tas',
    nameEn: 'Deepclean Bag',
    price: 45000,
    icon: 'backpack'
  },
  deepclean_bag_small: {
    name: 'Deepclean Tas Kecil',
    nameEn: 'Deepclean Bag (Small)',
    price: 35000,
    icon: 'work'
  },
  deepclean_bag_large: {
    name: 'Deepclean Tas Besar',
    nameEn: 'Deepclean Bag (Large)',
    price: 55000,
    icon: 'shopping_bag'
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
    nameEn: 'Repaint Leather',
    price: 75000,
    icon: 'format_paint'
  },
  repaint_suede: {
    name: 'Repaint Suede',
    nameEn: 'Repaint Suede',
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
      { value: 'Deepclean_Sandal', label: 'Deepclean Sandal', price: 25000 },
      { value: 'Deepclean_Tas', label: 'Deepclean Tas', price: 45000 },
      { value: 'deepclean_bag_small', label: 'Deepclean Tas Kecil', price: 35000 },
      { value: 'deepclean_bag_large', label: 'Deepclean Tas Besar', price: 55000 },
      // ... existing services
    ]
  },
  // ... other categories
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
  Deepclean_Sandal: '#3B82F6',
  Deepclean_Tas: '#60A5FA',
  deepclean_bag_small: '#93C5FD',
  deepclean_bag_large: '#3B82F6',
  tas_gunung: '#059669',
  topi: '#D97706',
  helm: '#D97706',
  one_day_service: '#EF4444',
  unyellowing: '#8B5CF6',
  whitening: '#A855F7',
  sewing: '#EC4899',
  repaint_canvas: '#14B8A6',
  repaint_leather: '#06B6D4',
  repaint_suede: '#0EA5E9',
  other: '#6B7280',
};
