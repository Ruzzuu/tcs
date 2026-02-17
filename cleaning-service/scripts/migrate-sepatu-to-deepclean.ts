// ============================================
// MIGRATE SEPATU TO DEEPCLEAN
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

async function migrateSepatuToDeepclean() {
  try {
    console.log('🔄 Starting migration: sepatu → Deepclean');

    await connectDB();
    console.log('✅ Connected to database');

    // Step 1: Count legacy orders with itemType = 'sepatu'
    const legacyCount = await Order.countDocuments({ itemType: 'sepatu' });
    console.log(`📊 Found ${legacyCount} legacy orders with itemType = 'sepatu'`);

    // Step 2: Count multi-item orders with serviceType = 'sepatu'
    const multiItemCount = await Order.countDocuments({ 'items.serviceType': 'sepatu' });
    console.log(`📊 Found ${multiItemCount} items in multi-item orders with serviceType = 'sepatu'`);

    if (legacyCount === 0 && multiItemCount === 0) {
      console.log('✨ No migrations needed - no sepatu values found');
      process.exit(0);
    }

    // Step 3: Update legacy orders (itemType field)
    let legacyUpdated = 0;
    if (legacyCount > 0) {
      const legacyResult = await Order.updateMany(
        { itemType: 'sepatu' },
        { $set: { itemType: 'Deepclean' } }
      );
      legacyUpdated = legacyResult.modifiedCount;
      console.log(`✅ Updated ${legacyUpdated} legacy orders: itemType 'sepatu' → 'Deepclean'`);
    }

    // Step 4: Update multi-item orders (items array)
    let itemsUpdated = 0;
    if (multiItemCount > 0) {
      const itemsResult = await Order.updateMany(
        { 'items.serviceType': 'sepatu' },
        { $set: { 'items.$[elem].serviceType': 'Deepclean' } },
        { arrayFilters: [{ 'elem.serviceType': 'sepatu' }] }
      );
      itemsUpdated = itemsResult.modifiedCount;
      console.log(`✅ Updated ${itemsUpdated} orders: items[].serviceType 'sepatu' → 'Deepclean'`);
    }

    // Step 5: Verification - Check for remaining 'sepatu' values
    const remainingLegacy = await Order.countDocuments({ itemType: 'sepatu' });
    const remainingItems = await Order.countDocuments({ 'items.serviceType': 'sepatu' });

    console.log('\n📊 Migration Summary:');
    console.log(`   Legacy orders updated: ${legacyUpdated}`);
    console.log(`   Multi-item orders updated: ${itemsUpdated}`);
    console.log(`   Total documents affected: ${Math.max(legacyUpdated, itemsUpdated)}`);
    console.log(`\n🔍 Verification:`);
    console.log(`   Remaining itemType 'sepatu': ${remainingLegacy}`);
    console.log(`   Remaining serviceType 'sepatu': ${remainingItems}`);

    if (remainingLegacy === 0 && remainingItems === 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('✅ All sepatu values have been migrated to Deepclean');
    } else {
      console.log('\n⚠️  Migration completed with warnings:');
      console.log(`   ${remainingLegacy} orders still have itemType = 'sepatu'`);
      console.log(`   ${remainingItems} items still have serviceType = 'sepatu'`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateSepatuToDeepclean();
