// ============================================
// MIGRATE - DELETE DELETED SERVICES
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { v2 as cloudinary } from 'cloudinary';
import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

async function migrateDeleteDeletedServices() {
  const startTime = Date.now();

  try {
    console.log('🗑️  Starting migration: Delete orders with removed services\n');
    console.log(`📅 Started at: ${new Date().toISOString()}\n`);

    await connectDB();
    console.log('✅ Connected to database\n');

    // Phase A: Find affected orders
    console.log('🔍 Finding affected orders...');
    const affectedOrders = await Order.find({
      $or: [
        { itemType: { $in: DELETED_SERVICES } },
        { 'items.serviceType': { $in: DELETED_SERVICES } }
      ],
      deleted: { $ne: true }
    }).lean();

    console.log(`✅ Found ${affectedOrders.length} orders to delete\n`);

    if (affectedOrders.length === 0) {
      console.log('✨ No orders to delete - migration not needed\n');
      process.exit(0);
    }

    // Phase B: Collect Cloudinary image public IDs
    console.log('📷 Collecting Cloudinary images...');
    const imagePublicIds: string[] = [];

    affectedOrders.forEach((order: any) => {
      // Before photos
      if (order.proofOfWork?.beforePhotos?.length > 0) {
        order.proofOfWork.beforePhotos.forEach((photo: any) => {
          if (photo.publicId) {
            imagePublicIds.push(photo.publicId);
          }
        });
      }

      // After photos
      if (order.proofOfWork?.afterPhotos?.length > 0) {
        order.proofOfWork.afterPhotos.forEach((photo: any) => {
          if (photo.publicId) {
            imagePublicIds.push(photo.publicId);
          }
        });
      }

      // Nota image
      if (order.notaImage?.publicId) {
        imagePublicIds.push(order.notaImage.publicId);
      }
    });

    // Remove duplicates
    const uniqueImageIds = [...new Set(imagePublicIds)];

    console.log(`✅ Found ${uniqueImageIds.length} unique images to delete\n`);

    // Phase C: Delete from Cloudinary
    let deletedImages = 0;
    let failedImages = 0;

    if (uniqueImageIds.length > 0) {
      console.log('☁️  Deleting images from Cloudinary...');

      // Delete in batches of 100
      const batchSize = 100;
      for (let i = 0; i < uniqueImageIds.length; i += batchSize) {
        const batch = uniqueImageIds.slice(i, i + batchSize);
        try {
          const result = await cloudinary.api.delete_resources(batch, {
            resource_type: 'image',
            type: 'upload'
          });

          if (result.deleted) {
            const deleted = Object.keys(result.deleted).filter(key => result.deleted[key] === 'deleted').length;
            deletedImages += deleted;
          }

          console.log(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(uniqueImageIds.length / batchSize)}: ${batch.length} images`);
        } catch (error) {
          console.error(`   ❌ Failed to delete batch: ${error}`);
          failedImages += batch.length;
        }
      }

      console.log(`\n✅ Cloudinary deletion complete:`);
      console.log(`   Deleted: ${deletedImages} images`);
      console.log(`   Failed: ${failedImages} images\n`);
    }

    // Phase D: Delete orders from MongoDB
    console.log('💾 Deleting orders from database...');
    const orderIdsToDelete = affectedOrders.map((order: any) => order._id);

    const deleteResult = await Order.deleteMany({
      _id: { $in: orderIdsToDelete }
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} orders from database\n`);

    // Phase E: Verification
    console.log('🔍 Verifying cleanup...');
    const remainingOrders = await Order.countDocuments({
      $or: [
        { itemType: { $in: DELETED_SERVICES } },
        { 'items.serviceType': { $in: DELETED_SERVICES } }
      ]
    });

    const remainingItems = await Order.countDocuments({
      'items.serviceType': { $in: DELETED_SERVICES }
    });

    console.log(`   Remaining orders: ${remainingOrders}`);
    console.log(`   Remaining items: ${remainingItems}\n`);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║          MIGRATION SUMMARY                 ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Orders deleted: ${deleteResult.deletedCount}`);
    console.log(`   Cloudinary images deleted: ${deletedImages}`);
    console.log(`   Cloudinary images failed: ${failedImages}`);

    if (remainingOrders === 0 && remainingItems === 0 && deleteResult.deletedCount === affectedOrders.length) {
      console.log('\n✨ Migration completed successfully!');
      console.log(`✅ All ${affectedOrders.length} orders deleted`);
      console.log(`✅ All ${deletedImages} images deleted from Cloudinary`);
      console.log(`✅ Verification passed: no remaining references`);
      console.log(`\n💾 Estimated storage saved: ~${deletedImages * 5} MB`);
      console.log(`⏱️  Time taken: ${duration}s\n`);

      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with warnings:');
      console.log(`   ${remainingOrders} orders still reference deleted services`);
      console.log(`   ${remainingItems} items still reference deleted services`);
      console.log(`   Expected to delete: ${affectedOrders.length} orders`);
      console.log(`   Actually deleted: ${deleteResult.deletedCount} orders`);

      if (remainingOrders > 0 || remainingItems > 0) {
        process.exit(1);
      }
    }

  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('\n❌ Migration failed!');
    console.error(`   Duration: ${duration}s`);
    console.error(`   Error:`, error);

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

migrateDeleteDeletedServices();
