import type { MetadataRoute } from 'next';
import { ACTIVE_TENANT } from '@/config/tenant';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${ACTIVE_TENANT.name} - Cleaning Service`,
    short_name: ACTIVE_TENANT.shortName,
    description: ACTIVE_TENANT.formDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1152d4',
    icons: [
      {
        src: ACTIVE_TENANT.logoUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: ACTIVE_TENANT.logoUrl,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
