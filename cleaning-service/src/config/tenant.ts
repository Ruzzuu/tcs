import type { ServiceType } from '@/types';

export type TenantId = 'tcs' | 'rekan';

type ServicePriceMap = Record<ServiceType, number>;

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

// Rekan starts with the current catalog so the second deployment is usable.
// Set NEXT_PUBLIC_SERVICE_PRICE_OVERRIDES in Rekan's Vercel project to apply
// its actual prices without changing or duplicating the application code.
const REKAN_PRICES: ServicePriceMap = {
  ...TCS_PRICES,
};

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
