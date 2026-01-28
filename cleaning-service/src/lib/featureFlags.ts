/**
 * Feature Flags Configuration
 * 
 * Control feature rollout with environment variables
 */

export const FEATURE_FLAGS = {
  // Enable multi-item orders (basket functionality)
  MULTI_ITEM_ORDERS: process.env.NEXT_PUBLIC_FEATURE_MULTI_ITEM === 'true',
  
  // Enable automatic order merging for same customer
  AUTO_MERGE_ORDERS: process.env.NEXT_PUBLIC_FEATURE_AUTO_MERGE === 'true',
} as const;

export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] === true;
}
