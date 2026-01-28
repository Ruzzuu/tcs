import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Rekap from '@/lib/models/Rekap';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Find all finished orders without Rekap
    const finishedOrders = await Order.find({
      status: 'finished',
      $or: [
        { rekapId: { $exists: false } },
        { rekapId: null }
      ]
    }).sort({ finishedAt: 1, createdAt: 1 });
    
    if (finishedOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders to backfill',
        data: {
          processed: 0,
          created: 0
        }
      });
    }
    
    let created = 0;
    let currentBalance = 0;
    
    // Get current balance
    const lastRekap = await Rekap.findOne().sort({ createdAt: -1 });
    if (lastRekap) {
      currentBalance = lastRekap.balanceSnapshot;
    }
    
    for (const order of finishedOrders) {
      try {
        const amount = order.finalPrice ?? order.subtotal ?? 0;
        currentBalance += amount;
        
        const rekap = await Rekap.create({
          orderId: order._id,
          amount,
          immutable: true,
          balanceSnapshot: currentBalance,
          createdAt: order.finishedAt || order.createdAt
        });
        
        order.rekapId = rekap._id.toString();
        await order.save();
        
        created++;
        console.log(`Backfilled Rekap for ${order.orderNumber}: Rp ${amount.toLocaleString('id-ID')}`);
      } catch (error: any) {
        console.error(`Failed to backfill order ${order.orderNumber}:`, error.message);
        // Continue with next order
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully backfilled ${created} orders`,
      data: {
        processed: finishedOrders.length,
        created,
        finalBalance: currentBalance
      }
    });
    
  } catch (error: any) {
    console.error('POST /api/orders/backfill-rekap error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to backfill rekap data' },
      { status: 500 }
    );
  }
}
