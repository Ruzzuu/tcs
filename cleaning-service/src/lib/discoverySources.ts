import type { DiscoverySource } from '@/types';

export const DISCOVERY_SOURCE_OPTIONS: Array<{
  value: DiscoverySource;
  label: string;
}> = [
  { value: 'friend', label: 'Teman' },
  { value: 'instagram', label: 'IG' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'other', label: 'Lainnya' },
];

export const DISCOVERY_SOURCE_VALUES = DISCOVERY_SOURCE_OPTIONS.map(
  (option) => option.value
);

export const DISCOVERY_SOURCE_LABELS = Object.fromEntries(
  DISCOVERY_SOURCE_OPTIONS.map((option) => [option.value, option.label])
) as Record<DiscoverySource, string>;
