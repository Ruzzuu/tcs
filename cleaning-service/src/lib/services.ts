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
  },
  sewing_dan_cuci: {
    name: 'Sewing (Jahit) dan Cuci',
    nameEn: 'Sewing and Washing',
    price: 60000,
    icon: 'local_laundry_service'
  },
  deepclean_kids: {
    name: 'Deepclean Kids',
    nameEn: 'Deepclean Kids',
    price: 30000,
    icon: 'child_care'
  },
  deepclean_topi: {
    name: 'Deepclean Topi',
    nameEn: 'Deepclean Hat',
    price: 25000,
    icon: 'school'
  },
  deepclean_fantofel: {
    name: 'Deepclean Fantofel',
    nameEn: 'Deepclean Fantofel',
    price: 30000,
    icon: 'checkroom'
  },
  deepclean_member: {
    name: 'Deepclean Member',
    nameEn: 'Deepclean Member',
    price: 30000,
    icon: 'card_membership'
  },
  deepclean_helm: {
    name: 'Deepclean Helm',
    nameEn: 'Deepclean Helmet',
    price: 35000,
    icon: 'sports_motorsports'
  },
  whitening: {
    name: 'Whitening Treatment',
    nameEn: 'Whitening Treatment',
    price: 50000,
    icon: 'auto_fix_high'
  },
  repaint_leather: {
    name: 'Repaint Leather',
    nameEn: 'Repaint Leather',
    price: 100000,
    icon: 'format_paint'
  },
  repaint_canvas: {
    name: 'Repaint Canvas',
    nameEn: 'Repaint Canvas',
    price: 100000,
    icon: 'brush'
  },
  repaint_suede: {
    name: 'Repaint Suede',
    nameEn: 'Repaint Suede',
    price: 100000,
    icon: 'palette'
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
      { value: 'one_day_service', label: 'One Day Service', price: 50000 },
      { value: 'sewing_dan_cuci', label: 'Sewing (Jahit) dan Cuci', price: 60000 },
      { value: 'deepclean_kids', label: 'Deepclean Kids', price: 30000 },
      { value: 'deepclean_topi', label: 'Deepclean Topi', price: 25000 },
      { value: 'deepclean_fantofel', label: 'Deepclean Fantofel', price: 30000 },
      { value: 'deepclean_member', label: 'Deepclean Member', price: 30000 },
      { value: 'deepclean_helm', label: 'Deepclean Helm', price: 35000 }
    ]
  },
  {
    name: 'Treatment',
    services: [
      { value: 'unyellowing', label: 'Unyellowing', price: 50000 },
      { value: 'sewing', label: 'Sewing (Jahit)', price: 35000 },
      { value: 'whitening', label: 'Whitening Treatment', price: 50000 },
      { value: 'repaint_leather', label: 'Repaint Leather', price: 100000 },
      { value: 'repaint_canvas', label: 'Repaint Canvas', price: 100000 },
      { value: 'repaint_suede', label: 'Repaint Suede', price: 100000 }
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
  sewing: '#EC4899',
  sewing_dan_cuci: '#F59E0B',
  deepclean_kids: '#EC4899',
  deepclean_topi: '#8B5CF6',
  deepclean_fantofel: '#10B981',
  deepclean_member: '#6366F1',
  deepclean_helm: '#F59E0B',
  whitening: '#A855F7',
  repaint_leather: '#8B4513',
  repaint_canvas: '#14B8A6',
  repaint_suede: '#0EA5E9'
};
