// Debug API to check Rekap vs Orders consistency
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Rekap from '@/lib/models/Rekap';

export async function GET() {
  try {
    await connectDB();

    // Get all Rekap entries
    const rekapEntries = await Rekap.find({}).sort({ createdAt: -1 }).lean();
    
    // Get all orders (including deleted)
    const allOrders = await Order.find({}).lean();
    
    // Analyze
    const analysis = {
      totalRekapEntries: rekapEntries.length,
      totalRekapAmount: rekapEntries.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
      rekapDetails: rekapEntries.map((r: any) => ({
        orderId: r.orderId,
        amount: r.amount,
        createdAt: r.createdAt,
        immutable: r.immutable
      })),
      
      totalOrders: allOrders.length,
      finishedOrders: allOrders.filter((o: any) => o.status === 'finished').length,
      deletedOrders: allOrders.filter((o: any) => o.deleted === true).length,
      ordersWithRekapId: allOrders.filter((o: any) => o.rekapId).length,
      
      orphanRekap: [] as any[],
      missingRekap: [] as any[]
    };

    // Find orphan Rekap (Rekap without matching order)
    for (const rekap of rekapEntries) {
      const matchingOrder = allOrders.find((o: any) => o._id.toString() === rekap.orderId.toString());
      if (!matchingOrder) {
        analysis.orphanRekap.push({
          rekapId: rekap._id,
          orderId: rekap.orderId,
          amount: rekap.amount,
          reason: 'Order not found in database'
        });
      } else if (matchingOrder.deleted && !matchingOrder.rekapId) {
        analysis.orphanRekap.push({
          rekapId: rekap._id,
          orderId: rekap.orderId,
          orderNumber: matchingOrder.orderNumber,
          amount: rekap.amount,
          reason: 'Order deleted but no rekapId reference'
        });
      }
    }

    // Find missing Rekap (finished deleted orders without Rekap)
    for (const order of allOrders) {
      if (order.deleted && order.status === 'finished' && !order.rekapId) {
        const hasRekap = rekapEntries.some((r: any) => r.orderId.toString() === order._id.toString());
        if (!hasRekap) {
          analysis.missingRekap.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            name: order.name,
            amount: order.finalPrice || order.subtotal,
            deletedAt: order.archivedAt
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('Debug Rekap error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
