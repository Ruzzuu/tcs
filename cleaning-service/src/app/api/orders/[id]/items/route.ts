// ============================================
// ORDER ITEMS API - Add items to existing order
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { SERVICES } from '@/lib/services';
import { ServiceType } from '@/types';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { createOrderItem, calculateOrderSubtotal, calculateOrderTotal } from '@/lib/orderUtils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/orders/[id]/items - Add item to existing order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isFeatureEnabled('MULTI_ITEM_ORDERS')) {
      return NextResponse.json(
        { success: false, error: 'Multi-item orders feature is not enabled' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { itemType, quantity, customItemType, notes } = body;

    // Validation
    const errors: string[] = [];

    if (!itemType || !SERVICES[itemType as ServiceType]) {
      errors.push('Jenis barang tidak valid');
    }

    if (itemType === 'other' && (!customItemType || customItemType.trim().length === 0)) {
      errors.push('Nama barang wajib diisi untuk kategori Lainnya');
    }

    if (!quantity || quantity < 1) {
      errors.push('Jumlah minimal 1');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Get order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if order can be modified
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Hanya pesanan pending yang dapat dimodifikasi' },
        { status: 400 }
      );
    }

    // Ensure items array exists
    if (!order.items) {
      order.items = [];
    }

    // Create new item
    const newItem = createOrderItem(
      itemType as ServiceType,
      quantity,
      itemType === 'other' ? customItemType?.trim() : undefined,
      notes?.trim()
    );

    // Add item to order
    order.items.push(newItem);

    // Recalculate totals
    const subtotal = calculateOrderSubtotal(order.items);
    const pricing = calculateOrderTotal(order.items, order.discount);
    
    order.subtotal = subtotal;
    order.estimatedPrice = subtotal;
    order.finalPrice = pricing.total;

    await order.save();

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Item berhasil ditambahkan'
    });
  } catch (error) {
    console.error('POST /api/orders/[id]/items error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan item' },
      { status: 500 }
    );
  }
}
