// Backfill Rekap entries for finished orders without rekapId
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Rekap from '@/lib/models/Rekap';

export async function POST() {
  try {
    await connectDB();

    console.log('🔍 Starting backfill process...');

    // Find finished orders without rekapId that are NOT deleted
    // Use aggregate to avoid casting issues with empty string
    const ordersWithoutRekap = await Order.aggregate([
      {
        $match: {
          status: 'finished',
          deleted: { $ne: true },
          finalPrice: { $gt: 0 },
          $or: [
            { rekapId: { $exists: false } },
            { rekapId: null },
            { rekapId: '' }
          ]
        }
      }
    ]);

    console.log(`🔍 Found ${ordersWithoutRekap.length} orders without Rekap`);
    ordersWithoutRekap.forEach(o => {
      console.log(`  - ${o.orderNumber} (${o.name}): Rp ${o.finalPrice}, finishedAt: ${o.finishedAt}`);
    });

    const results = {
      success: true,
      ordersProcessed: [] as any[],
      errors: [] as any[],
      foundOrders: ordersWithoutRekap.length
    };

    for (const orderData of ordersWithoutRekap) {
      try {
        console.log(`📝 Creating Rekap for ${orderData.orderNumber}...`);
        
        // Create Rekap entry using finishedAt as createdAt
        const rekapEntry = new Rekap({
          orderId: orderData._id,
          amount: orderData.finalPrice || orderData.subtotal || 0,
          immutable: true,
          balanceSnapshot: 0,
          createdAt: orderData.finishedAt || new Date()
        });
        
        await rekapEntry.save();
        console.log(`✅ Saved Rekap ${rekapEntry._id}`);
        
        // Update order with rekapId using findByIdAndUpdate
        await Order.findByIdAndUpdate(orderData._id, {
          rekapId: rekapEntry._id.toString()
        });
        console.log(`✅ Updated order ${orderData.orderNumber} with rekapId`);
        
        results.ordersProcessed.push({
          orderNumber: orderData.orderNumber,
          name: orderData.name,
          amount: rekapEntry.amount,
          rekapId: rekapEntry._id.toString(),
          createdAt: rekapEntry.createdAt
        });
        
        console.log(`✅ Backfilled Rekap for ${orderData.orderNumber}: Rp ${rekapEntry.amount}`);
      } catch (error: any) {
        console.error(`❌ Failed to backfill ${orderData.orderNumber}:`, error);
        results.errors.push({
          orderNumber: orderData.orderNumber,
          error: error.message,
          stack: error.stack
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Backfill Rekap error:', error);
    return NextResponse.json(
      { success: false, error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
