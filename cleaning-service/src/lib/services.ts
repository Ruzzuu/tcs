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
    name: 'Deepclean Tas (Small)',
    nameEn: 'Deepclean Bag (Small)',
    price: 35000,
    icon: 'work'
  },
  deepclean_bag_large: {
    name: 'Deepclean Tas (Large)',
    nameEn: 'Deepclean Bag (Large)',
    price: 55000,
    icon: 'shopping_bag'
  },
  one_day_service: {
    name: 'One Day Service',
    nameEn: 'One Day Service',
    price: 50000,
    icon: 'bolt'
  },
  unyellowing: {
    name: 'Unyellowing',
    nameEn: 'Unyellowing',
    price: 50000,
    icon: 'wb_sunny'
  },
  sewing: {
    name: 'Sewing (Jahit)',
    nameEn: 'Sewing',
    price: 35000,
    icon: 'content_cut'
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
      { value: 'deepclean_bag_small', label: 'Deepclean Tas (Small)', price: 35000 },
      { value: 'deepclean_bag_large', label: 'Deepclean Tas (Large)', price: 55000 },
      { value: 'one_day_service', label: 'One Day Service', price: 50000 }
    ]
  },
  {
    name: 'Treatment',
    services: [
      { value: 'unyellowing', label: 'Unyellowing', price: 50000 },
      { value: 'sewing', label: 'Sewing (Jahit)', price: 35000 }
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
  Deepclean_Sandal: '#3B82F6',
  Deepclean_Tas: '#60A5FA',
  deepclean_bag_small: '#93C5FD',
  deepclean_bag_large: '#3B82F6',
  one_day_service: '#EF4444',
  unyellowing: '#8B5CF6',
  sewing: '#EC4899'
};
