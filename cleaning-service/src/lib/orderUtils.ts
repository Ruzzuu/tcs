/**
 * Order Utilities - Multi-Item Order Operations
 */

import { OrderItem } from '@/types';
import { SERVICES } from './services';
import type { ServiceType } from '@/types';

/**
 * Generate unique item ID
 */
export function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new order item
 */
export function createOrderItem(
  serviceType: ServiceType,
  quantity: number,
  customItemType?: string,
  notes?: string
): OrderItem {
  const service = SERVICES[serviceType];
  const unitPrice = service?.price || 0;
  
  return {
    id: generateItemId(),
    serviceType,
    quantity,
    unitPrice,
    subtotal: unitPrice * quantity,
    notes,
    customItemType,
    createdAt: new Date()
  };
}

/**
 * Calculate order subtotal from items
 */
export function calculateOrderSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

/**
 * Calculate order total with discount
 */
export function calculateOrderTotal(
  items: OrderItem[],
  discount?: { type: 'percentage' | 'fixed'; value: number }
): { subtotal: number; discountAmount: number; total: number } {
  const subtotal = calculateOrderSubtotal(items);
  let discountAmount = 0;

  if (discount) {
    if (discount.type === 'percentage') {
      const percentage = Math.max(0, Math.min(100, discount.value));
      discountAmount = Math.round((subtotal * percentage) / 100);
    } else if (discount.type === 'fixed') {
      discountAmount = Math.max(0, discount.value);
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  return {
    subtotal,
    discountAmount,
    total
  };
}

/**
 * Update item subtotal when quantity or price changes
 */
export function updateItemSubtotal(item: OrderItem): OrderItem {
  return {
    ...item,
    subtotal: item.unitPrice * item.quantity
  };
}

/**
 * Find existing pending order for customer
 * Used to determine if we should append to existing order or create new one
 */
export function shouldAppendToOrder(
  existingOrder: any,
  customerPhone: string,
  customerAddress: string
): boolean {
  console.log('🔎 shouldAppendToOrder checking:', {
    orderStatus: existingOrder.status,
    orderPhone: existingOrder.phone,
    customerPhone,
    orderCreatedAt: existingOrder.createdAt
  });

  // Only append to pending orders
  if (existingOrder.status !== 'pending') {
    console.log('❌ Status not pending:', existingOrder.status);
    return false;
  }

  // Match by phone
  if (existingOrder.phone !== customerPhone) {
    console.log('❌ Phone mismatch:', {
      orderPhone: existingOrder.phone,
      customerPhone
    });
    return false;
  }

  // Optionally match by address (can be relaxed)
  // if (existingOrder.address !== customerAddress) {
  //   return false;
  // }

  // Check if order is from same day
  const orderDate = new Date(existingOrder.createdAt);
  const today = new Date();
  orderDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const isSameDay = orderDate.getTime() === today.getTime();
  console.log('📅 Date check:', {
    orderDate: orderDate.toISOString(),
    today: today.toISOString(),
    isSameDay
  });

  return isSameDay;
}
