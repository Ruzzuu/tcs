import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Order from '@/lib/models/Order';

export async function GET(request: Request) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    // Check environment variables
    const envVars = {
      NEXT_PUBLIC_FEATURE_MULTI_ITEM: process.env.NEXT_PUBLIC_FEATURE_MULTI_ITEM,
      NEXT_PUBLIC_FEATURE_AUTO_MERGE: process.env.NEXT_PUBLIC_FEATURE_AUTO_MERGE,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    // Import feature flags
    const { FEATURE_FLAGS } = await import('@/lib/featureFlags');
    
    const diagnosticData: any = {
      timestamp: new Date().toISOString(),
      environment: {
        raw: envVars,
        parsed: FEATURE_FLAGS,
      },
    };
    
    // If phone provided, get recent orders
    if (phone) {
      const recentOrders = await Order.find({ 
        phone: phone.trim() 
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
      
      diagnosticData.orders = recentOrders.map((order: any) => ({
        orderNumber: order.orderNumber,
        name: order.name,
        phone: order.phone,
        status: order.status,
        createdAt: order.createdAt,
        hasItemsArray: !!order.items,
        itemsCount: order.items?.length || 0,
        legacyItemType: order.itemType || null,
        subtotal: order.subtotal,
        finalPrice: order.finalPrice,
      }));
    }
    
    return NextResponse.json(diagnosticData);
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
