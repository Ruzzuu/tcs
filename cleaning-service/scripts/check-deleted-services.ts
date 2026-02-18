// ============================================
// CHECK DELETED SERVICES - ANALYZE EXISTING ORDERS
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

// Services to delete
const DELETED_SERVICES = [
  'tas_gunung',
  'helm',
  'topi',
  'whitening',
  'repaint_canvas',
  'repaint_leather',
  'repaint_suede',
  'other'
];

async function checkDeletedServices() {
  const startTime = Date.now();

  try {
    console.log('🔍 Analyzing orders with deleted services...\n');

    await connectDB();
    console.log('✅ Connected to database\n');

    // Step 1: Count orders with itemType in deleted services
    const itemTypeStats = await Order.aggregate([
      { $match: { itemType: { $in: DELETED_SERVICES }, deleted: { $ne: true } } },
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalItemTypeOrders = itemTypeStats.reduce((sum, stat) => sum + stat.count, 0);

    console.log('📊 Orders by itemType:');
    itemTypeStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} orders`);
    });
    console.log(`   Total: ${totalItemTypeOrders} orders\n`);

    // Step 2: Count orders with items containing deleted services
    const itemsServiceStats = await Order.aggregate([
      { $match: { deleted: { $ne: true } } },
      { $unwind: '$items' },
      { $match: { 'items.serviceType': { $in: DELETED_SERVICES } } },
      {
        $group: {
          _id: '$items.serviceType',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totalItems = itemsServiceStats.reduce((sum, stat) => sum + stat.count, 0);

    console.log('📊 Items by serviceType:');
    itemsServiceStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} items`);
    });
    console.log(`   Total: ${totalItems} items\n`);

    // Step 3: Get detailed list of affected orders
    const affectedOrders = await Order.find({
      $or: [
        { itemType: { $in: DELETED_SERVICES } },
        { 'items.serviceType': { $in: DELETED_SERVICES } }
      ],
      deleted: { $ne: true }
    })
      .select('orderNumber name phone itemType status createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const totalAffectedOrders = affectedOrders.length;

    console.log('📋 Affected Orders (first 10):');
    affectedOrders.slice(0, 10).forEach(order => {
      const hasItemType = DELETED_SERVICES.includes(order.itemType as any);
      const hasItemService = order.items?.some((item: any) => DELETED_SERVICES.includes(item.serviceType));
      const reason = hasItemType ? `itemType=${order.itemType}` : `items serviceType`;
      console.log(`   ${order.orderNumber} - ${order.name} - ${order.phone} - ${order.status} (${reason})`);
    });
    if (totalAffectedOrders > 10) {
      console.log(`   ... and ${totalAffectedOrders - 10} more orders`);
    }
    console.log(`\n   Total affected orders: ${totalAffectedOrders}\n`);

    // Step 4: Count Cloudinary images to delete
    let totalImages = 0;
    const imageBreakdown: any = {
      beforePhotos: 0,
      afterPhotos: 0,
      notaImages: 0
    };

    affectedOrders.forEach((order: any) => {
      if (order.proofOfWork?.beforePhotos?.length > 0) {
        imageBreakdown.beforePhotos += order.proofOfWork.beforePhotos.length;
      }
      if (order.proofOfWork?.afterPhotos?.length > 0) {
        imageBreakdown.afterPhotos += order.proofOfWork.afterPhotos.length;
      }
      if (order.notaImage) {
        imageBreakdown.notaImages++;
      }
    });

    totalImages = imageBreakdown.beforePhotos + imageBreakdown.afterPhotos + imageBreakdown.notaImages;

    console.log('🖼️  Cloudinary Images to Delete:');
    console.log(`   Before photos: ${imageBreakdown.beforePhotos}`);
    console.log(`   After photos: ${imageBreakdown.afterPhotos}`);
    console.log(`   Nota images: ${imageBreakdown.notaImages}`);
    console.log(`   Total images: ${totalImages}\n`);

    // Step 5: Estimate storage savings (average ~5MB per image)
    const estimatedStorageSaved = totalImages * 5;

    console.log('💰 Estimated Memory Savings:');
    console.log(`   Database orders: ~${totalAffectedOrders} KB`);
    console.log(`   Cloudinary images: ~${estimatedStorageSaved} MB (assuming 5MB per image)`);
    console.log(`   Total: ~${estimatedStorageSaved} MB\n`);

    // Step 6: Status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $match: {
          $or: [
            { itemType: { $in: DELETED_SERVICES } },
            { 'items.serviceType': { $in: DELETED_SERVICES } }
          ],
          deleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('📈 Status Breakdown:');
    statusBreakdown.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} orders`);
    });
    console.log();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║          ANALYSIS SUMMARY                  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`   Analysis completed in: ${duration}s`);
    console.log(`   Orders to delete: ${totalAffectedOrders}`);
    console.log(`   Items to delete: ${totalItems}`);
    console.log(`   Images to delete: ${totalImages}`);
    console.log(`   Estimated savings: ~${estimatedStorageSaved} MB`);
    console.log(`\n   Services being removed:`);
    DELETED_SERVICES.forEach(service => {
      console.log(`   - ${service}`);
    });
    console.log('\n✅ Ready to proceed with migration\n');

    process.exit(0);

  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('\n❌ Analysis failed!');
    console.error(`   Duration: ${duration}s`);
    console.error(`   Error:`, error);

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

checkDeletedServices();
