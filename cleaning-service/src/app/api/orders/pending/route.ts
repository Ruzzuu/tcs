// ============================================
// PENDING ORDERS API - Get Unverified Orders
// ============================================

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

// GET /api/orders/pending - Get all unverified orders
export async function GET() {
  try {
    await connectDB();

    const orders = await Order.find({ 'verification.status': 'unverified' })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('GET /api/orders/pending error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pesanan pending' },
      { status: 500 }
    );
  }
}
