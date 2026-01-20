// ============================================
// ORDER ITEM DELETE API - Remove item from order
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { calculateOrderSubtotal, calculateOrderTotal } from '@/lib/orderUtils';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

// DELETE /api/orders/[id]/items/[itemId] - Remove item from order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    if (!isFeatureEnabled('MULTI_ITEM_ORDERS')) {
      return NextResponse.json(
        { success: false, error: 'Multi-item orders feature is not enabled' },
        { status: 403 }
      );
    }

    await connectDB();
    const { id, itemId } = await params;

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

    // Check if order has items array
    if (!order.items || order.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak memiliki items array' },
        { status: 400 }
      );
    }

    // Find and remove item
    const itemIndex = order.items.findIndex((item: any) => item.id === itemId);

    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Item tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if this is the last item
    if (order.items.length === 1) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menghapus item terakhir. Hapus pesanan jika perlu.' },
        { status: 400 }
      );
    }

    // Remove item
    order.items.splice(itemIndex, 1);

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
      message: 'Item berhasil dihapus'
    });
  } catch (error) {
    console.error('DELETE /api/orders/[id]/items/[itemId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus item' },
      { status: 500 }
    );
  }
}
