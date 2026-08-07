import type { ServiceType } from '@/types';

export type TenantId = 'tcs' | 'rekan';

type ServicePriceMap = Record<ServiceType, number>;

type ServiceNameOverride = {
  name: string;
  nameEn?: string;
};

export interface TenantConfig {
  id: TenantId;
  name: string;
  shortName: string;
  logoUrl: string;
  invoiceLogoUrl: string;
  tagline: string;
  address: string;
  formDescription: string;
  databaseName: string;
  cloudinaryBaseFolder: string;
  servicePrices: ServicePriceMap;
  serviceNames?: Partial<Record<ServiceType, ServiceNameOverride>>;
  visibleServiceTypes?: ServiceType[];
}

const TCS_PRICES: ServicePriceMap = {
  Deepclean: 35000,
  Deepclean_Sandal: 25000,
  Deepclean_Tas: 45000,
  deepclean_bag_small: 35000,
  deepclean_bag_large: 55000,
  one_day_service: 50000,
  unyellowing: 50000,
  sewing: 35000,
  sewing_dan_cuci: 60000,
  deepclean_kids: 30000,
  deepclean_topi: 25000,
  deepclean_fantofel: 30000,
  deepclean_member: 30000,
  deepclean_helm: 35000,
  whitening: 50000,
  repaint_leather: 100000,
  repaint_canvas: 100000,
  repaint_suede: 100000,
};

const REKAN_PRICES: ServicePriceMap = {
  ...TCS_PRICES,
  Deepclean: 50000,
  Deepclean_Sandal: 40000,
  Deepclean_Tas: 65000,
  deepclean_bag_small: 65000,
  deepclean_bag_large: 75000,
  one_day_service: 70000,
  deepclean_topi: 30000,
  deepclean_fantofel: 40000,
  deepclean_member: 60000,
  deepclean_helm: 50000,
  whitening: 55000,
  unyellowing: 80000,
};

const REKAN_SERVICE_NAMES: Partial<Record<ServiceType, ServiceNameOverride>> = {
  Deepclean: { name: 'Deep Clean Reguler', nameEn: 'Regular Deep Clean' },
  Deepclean_Sandal: { name: 'Deep Clean Sandal', nameEn: 'Deep Clean Sandal' },
  Deepclean_Tas: { name: 'Deep Clean Tas', nameEn: 'Deep Clean Bag' },
  deepclean_bag_small: { name: 'Deep Clean Tas (Small)', nameEn: 'Deep Clean Bag (Small)' },
  deepclean_bag_large: { name: 'Deep Clean Tas (Large)', nameEn: 'Deep Clean Bag (Large)' },
  deepclean_topi: { name: 'Deep Clean Topi', nameEn: 'Deep Clean Hat' },
  deepclean_fantofel: { name: 'Deep Clean Flat Shoe', nameEn: 'Deep Clean Flat Shoe' },
  deepclean_member: { name: 'Deep Clean', nameEn: 'Deep Clean' },
  deepclean_helm: { name: 'Deep Clean Helm', nameEn: 'Deep Clean Helmet' },
  whitening: { name: 'Whitening Treatment', nameEn: 'Whitening Treatment' },
  unyellowing: { name: 'Unyellowing', nameEn: 'Unyellowing' },
};

const REKAN_VISIBLE_SERVICES: ServiceType[] = [
  'Deepclean',
  'Deepclean_Sandal',
  'Deepclean_Tas',
  'deepclean_bag_small',
  'deepclean_bag_large',
  'one_day_service',
  'deepclean_topi',
  'deepclean_helm',
  'deepclean_fantofel',
  'deepclean_member',
  'whitening',
  'unyellowing',
];

const TENANTS: Record<TenantId, TenantConfig> = {
  tcs: {
    id: 'tcs',
    name: 'Teman Cuci Sepatu',
    shortName: 'TCS',
    logoUrl: 'https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/f_auto,q_auto/v1768543427/logo_tcs_keooto.png',
    invoiceLogoUrl: 'https://res.cloudinary.com/dncpyspjq/image/upload/e_background_removal/v1768543427/logo_tcs_keooto.png',
    tagline: 'Solusi Sepatu Kotor dan Bau',
    address: 'Jl. Keputih Tegal No.36C, Keputih, Kec. Sukolilo, Surabaya, Jawa Timur 60111',
    formDescription: 'Isi data di bawah ini untuk layanan penjemputan gratis ke lokasi Anda.',
    databaseName: 'cleaning-service',
    cloudinaryBaseFolder: 'cleaning-app',
    servicePrices: TCS_PRICES,
  },
  rekan: {
    id: 'rekan',
    name: 'Rekan Cuci Sepatu',
    shortName: 'RCS',
    logoUrl: '/tenants/rekan/logo.png',
    invoiceLogoUrl: '/tenants/rekan/logo.png',
    tagline: 'Your Shoes, Our Care',
    address: 'Tebet, Cempaka Putih, Pulo Gadung Area',
    formDescription: 'Isi data di bawah ini untuk menggunakan layanan kami.',
    databaseName: 'cleaning-service-rekan',
    cloudinaryBaseFolder: 'cleaning-app/rekan-cuci-sepatu',
    servicePrices: REKAN_PRICES,
    serviceNames: REKAN_SERVICE_NAMES,
    visibleServiceTypes: REKAN_VISIBLE_SERVICES,
  },
};

function resolveTenantId(): TenantId {
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

  if (!tenantId) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_TENANT_ID is required in production');
    }

    return 'tcs';
  }

  if (tenantId !== 'tcs' && tenantId !== 'rekan') {
    throw new Error(`Unknown NEXT_PUBLIC_TENANT_ID: ${tenantId}`);
  }

  return tenantId;
}

function resolvePriceOverrides(basePrices: ServicePriceMap): Partial<ServicePriceMap> {
  const rawOverrides = process.env.NEXT_PUBLIC_SERVICE_PRICE_OVERRIDES;
  if (!rawOverrides) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawOverrides);
  } catch {
    throw new Error('NEXT_PUBLIC_SERVICE_PRICE_OVERRIDES must be valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('NEXT_PUBLIC_SERVICE_PRICE_OVERRIDES must be a JSON object');
  }

  const overrides: Partial<ServicePriceMap> = {};

  for (const [serviceType, value] of Object.entries(parsed)) {
    if (!(serviceType in basePrices)) {
      throw new Error(`Unknown service in price overrides: ${serviceType}`);
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid price override for ${serviceType}`);
    }

    overrides[serviceType as ServiceType] = value;
  }

  return overrides;
}

const selectedTenant = TENANTS[resolveTenantId()];

export const ACTIVE_TENANT: TenantConfig = {
  ...selectedTenant,
  servicePrices: {
    ...selectedTenant.servicePrices,
    ...resolvePriceOverrides(selectedTenant.servicePrices),
  },
};

export const TENANT_ID = ACTIVE_TENANT.id;
