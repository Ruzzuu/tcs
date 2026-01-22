// Clean up duplicate Rekap entries
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Rekap from '@/lib/models/Rekap';

export async function POST() {
  try {
    await connectDB();

    console.log('🔍 Finding duplicate Rekap entries...');

    // Get all Rekap entries
    const allRekaps = await Rekap.find({}).sort({ createdAt: 1 }).lean();
    
    // Group by orderId
    const orderIdMap = new Map<string, any[]>();
    allRekaps.forEach((rekap: any) => {
      const orderId = rekap.orderId.toString();
      if (!orderIdMap.has(orderId)) {
        orderIdMap.set(orderId, []);
      }
      orderIdMap.get(orderId)!.push(rekap);
    });

    const duplicates: any[] = [];
    const toDelete: string[] = [];

    // Find duplicates (keep first, delete rest)
    orderIdMap.forEach((rekaps, orderId) => {
      if (rekaps.length > 1) {
        duplicates.push({
          orderId,
          count: rekaps.length,
          entries: rekaps.map((r: any) => ({
            _id: r._id.toString(),
            amount: r.amount,
            createdAt: r.createdAt
          }))
        });

        // Keep the first one, delete the rest
        for (let i = 1; i < rekaps.length; i++) {
          toDelete.push(rekaps[i]._id.toString());
        }
      }
    });

    console.log(`🔍 Found ${duplicates.length} orders with duplicates`);
    console.log(`🗑️  Will delete ${toDelete.length} duplicate Rekap entries`);

    // Delete duplicates
    if (toDelete.length > 0) {
      await Rekap.deleteMany({
        _id: { $in: toDelete }
      });
      console.log(`✅ Deleted ${toDelete.length} duplicate Rekap entries`);
    }

    return NextResponse.json({
      success: true,
      duplicatesFound: duplicates.length,
      entriesDeleted: toDelete.length,
      duplicates
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
