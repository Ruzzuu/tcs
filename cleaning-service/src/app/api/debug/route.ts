// ============================================
// DEBUG API - Check Feature Flags and Orders
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { isFeatureEnabled } from '@/lib/featureFlags';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    // Check feature flags
    const flags = {
      MULTI_ITEM_ORDERS: isFeatureEnabled('MULTI_ITEM_ORDERS'),
      AUTO_MERGE_ORDERS: isFeatureEnabled('AUTO_MERGE_ORDERS'),
      env: {
        MULTI_ITEM: process.env.NEXT_PUBLIC_FEATURE_MULTI_ITEM,
        AUTO_MERGE: process.env.NEXT_PUBLIC_FEATURE_AUTO_MERGE
      }
    };

    // Get orders for phone if provided
    let orders = null;
    if (phone) {
      orders = await Order.find({ 
        phone: phone.trim(),
        status: 'pending'
      }).sort({ createdAt: -1 }).limit(5).lean();
    }

    return NextResponse.json({
      success: true,
      data: {
        flags,
        phone: phone || null,
        orders: orders || [],
        message: 'Use ?phone=081515263851 to check specific orders'
      }
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { success: false, error: 'Debug failed' },
      { status: 500 }
    );
  }
}
