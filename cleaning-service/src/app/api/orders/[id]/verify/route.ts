// ============================================
// VERIFY ORDER API - Approve or Reject
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/orders/[id]/verify - Approve or Reject order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action harus approved atau rejected' },
        { status: 400 }
      );
    }

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (order.verification.status !== 'unverified') {
      return NextResponse.json(
        { success: false, error: 'Pesanan sudah diverifikasi sebelumnya' },
        { status: 400 }
      );
    }

    if (action === 'rejected') {
      // Delete the order if rejected
      await Order.findByIdAndDelete(id);
      
      return NextResponse.json({
        success: true,
        message: 'Pesanan ditolak dan dihapus'
      });
    }

    // Approve the order
    order.verification.status = 'approved';
    order.verification.verifiedAt = new Date();
    
    // Ensure backward compatibility: set subtotal if missing
    if (!order.subtotal) {
      order.subtotal = order.finalPrice || order.estimatedPrice || 0;
    }
    
    await order.save();

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Pesanan berhasil diverifikasi'
    });
  } catch (error) {
    console.error('POST /api/orders/[id]/verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memverifikasi pesanan' },
      { status: 500 }
    );
  }
}
