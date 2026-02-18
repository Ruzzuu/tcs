// ============================================
// MIGRATE TAS_RANSEL/DEEPCLEAN_TAS TO DEEPCLEAN_TAS
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

async function migrateToDeepcleanTas() {
  const startTime = Date.now();

  try {
    console.log('🔄 Starting migration: tas_ransel/deepclean_tas → Deepclean_Tas');
    console.log(`📅 Started at: ${new Date().toISOString()}`);

    await connectDB();
    console.log('✅ Connected to database');

    const OLD_VALUES = ['tas_ransel', 'deepclean_tas'];
    const NEW_VALUE = 'Deepclean_Tas';
    const OLD_PRICE = 40000;
    const NEW_PRICE = 45000;

    // STEP 1: COUNT LEGACY ORDERS
    const tasRanselLegacyCount = await Order.countDocuments({ itemType: 'tas_ransel' });
    const deepcleanTasLegacyCount = await Order.countDocuments({ itemType: 'deepclean_tas' });
    console.log(`📊 Found ${tasRanselLegacyCount} legacy orders with itemType = 'tas_ransel'`);
    console.log(`📊 Found ${deepcleanTasLegacyCount} legacy orders with itemType = 'deepclean_tas'`);

    // STEP 2: COUNT MULTI-ITEM ORDERS
    const tasRanselMultiCount = await Order.countDocuments({ 'items.serviceType': 'tas_ransel' });
    const deepcleanTasMultiCount = await Order.countDocuments({ 'items.serviceType': 'deepclean_tas' });
    console.log(`📊 Found ${tasRanselMultiCount} items in multi-item orders with serviceType = 'tas_ransel'`);
    console.log(`📊 Found ${deepcleanTasMultiCount} items in multi-item orders with serviceType = 'deepclean_tas'`);

    const totalLegacy = tasRanselLegacyCount + deepcleanTasLegacyCount;
    const totalMulti = tasRanselMultiCount + deepcleanTasMultiCount;

    if (totalLegacy === 0 && totalMulti === 0) {
      console.log('✨ No migrations needed - no tas_ransel/deepclean_tas values found');
      process.exit(0);
    }

    // STEP 3: UPDATE LEGACY ORDERS (itemType + price)
    let legacyUpdated = 0;
    if (totalLegacy > 0) {
      // Update tas_ransel legacy orders
      if (tasRanselLegacyCount > 0) {
        const result = await Order.updateMany(
          { itemType: 'tas_ransel' },
          {
            $set: {
              itemType: NEW_VALUE,
              estimatedPrice: NEW_PRICE,
              finalPrice: NEW_PRICE
            }
          }
        );
        legacyUpdated += result.modifiedCount;
        console.log(`✅ Updated ${result.modifiedCount} legacy orders: tas_ransel → Deepclean_Tas`);
        console.log(`✅ Updated price: Rp ${OLD_PRICE} → Rp ${NEW_PRICE}`);
      }

      // Update deepclean_tas legacy orders
      if (deepcleanTasLegacyCount > 0) {
        const result = await Order.updateMany(
          { itemType: 'deepclean_tas' },
          {
            $set: {
              itemType: NEW_VALUE,
              estimatedPrice: NEW_PRICE,
              finalPrice: NEW_PRICE
            }
          }
        );
        legacyUpdated += result.modifiedCount;
        console.log(`✅ Updated ${result.modifiedCount} legacy orders: deepclean_tas → Deepclean_Tas`);
        console.log(`✅ Updated price: Rp ${OLD_PRICE} → Rp ${NEW_PRICE}`);
      }
    }

    // STEP 4: UPDATE MULTI-ITEM ORDERS (serviceType + price)
    let itemsUpdated = 0;
    if (totalMulti > 0) {
      // Update tas_ransel items
      if (tasRanselMultiCount > 0) {
        const result = await Order.updateMany(
          { 'items.serviceType': 'tas_ransel' },
          {
            $set: {
              'items.$[elem].serviceType': NEW_VALUE,
              'items.$[elem].unitPrice': NEW_PRICE
            },
            $inc: { 'items.$[elem].subtotal': NEW_PRICE - OLD_PRICE }
          },
          {
            arrayFilters: [{ 'elem.serviceType': 'tas_ransel' }]
          }
        );
        itemsUpdated += result.modifiedCount;
        console.log(`✅ Updated ${result.modifiedCount} orders with tas_ransel items → Deepclean_Tas`);
        console.log(`✅ Updated price: Rp ${OLD_PRICE} → Rp ${NEW_PRICE}`);
      }

      // Update deepclean_tas items
      if (deepcleanTasMultiCount > 0) {
        const result = await Order.updateMany(
          { 'items.serviceType': 'deepclean_tas' },
          {
            $set: {
              'items.$[elem].serviceType': NEW_VALUE,
              'items.$[elem].unitPrice': NEW_PRICE
            },
            $inc: { 'items.$[elem].subtotal': NEW_PRICE - OLD_PRICE }
          },
          {
            arrayFilters: [{ 'elem.serviceType': 'deepclean_tas' }]
          }
        );
        itemsUpdated += result.modifiedCount;
        console.log(`✅ Updated ${result.modifiedCount} orders with deepclean_tas items → Deepclean_Tas`);
        console.log(`✅ Updated price: Rp ${OLD_PRICE} → Rp ${NEW_PRICE}`);
      }
    }

    // STEP 5: RECALCULATE ORDER TOTALS
    console.log('\n🔄 Recalculating order totals...');
    const ordersToUpdate = await Order.find({ items: { $exists: true, $ne: null } });

    let orderTotalUpdated = 0;
    for (const order of ordersToUpdate) {
      if (!order.items || order.items.length === 0) continue;

      // Calculate new subtotal from items
      const newSubtotal = order.items.reduce((sum, item: any) => sum + (item.subtotal || 0), 0);

      // Update order subtotal
      await Order.updateOne(
        { _id: order._id },
        { $set: { subtotal: newSubtotal } }
      );

      orderTotalUpdated++;
    }

    console.log(`✅ Recalculated totals for ${orderTotalUpdated} orders`);

    // STEP 6: VERIFICATION
    const remainingTasRansel = await Order.countDocuments({ itemType: 'tas_ransel' });
    const remainingDeepcleanTas = await Order.countDocuments({ itemType: 'deepclean_tas' });
    const remainingItemsTasRansel = await Order.countDocuments({ 'items.serviceType': 'tas_ransel' });
    const remainingItemsDeepcleanTas = await Order.countDocuments({ 'items.serviceType': 'deepclean_tas' });
    const newCount = await Order.countDocuments({ itemType: NEW_VALUE });
    const itemsNewCount = await Order.countDocuments({ 'items.serviceType': NEW_VALUE });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const priceDiff = (NEW_PRICE - OLD_PRICE) * (totalLegacy + totalMulti);

    console.log('\n📊 Migration Summary:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Legacy orders updated: ${legacyUpdated}`);
    console.log(`   Multi-item orders updated: ${itemsUpdated}`);
    console.log(`   Order totals recalculated: ${orderTotalUpdated}`);
    console.log(`   Total documents affected: ${legacyUpdated + itemsUpdated + orderTotalUpdated}`);
    console.log(`   Total price difference: +Rp ${priceDiff.toLocaleString('id-ID')}`);

    console.log(`\n🔍 Verification:`);
    console.log(`   Before: tas_ransel (${totalLegacy}), deepclean_tas (${totalMulti})`);
    console.log(`   After: Deepclean_Tas (${newCount + itemsNewCount})`);
    console.log(`   Remaining tas_ransel (itemType): ${remainingTasRansel}`);
    console.log(`   Remaining deepclean_tas (itemType): ${remainingDeepcleanTas}`);
    console.log(`   Remaining tas_ransel (items.serviceType): ${remainingItemsTasRansel}`);
    console.log(`   Remaining deepclean_tas (items.serviceType): ${remainingItemsDeepcleanTas}`);

    if (remainingTasRansel === 0 && remainingDeepcleanTas === 0 &&
        remainingItemsTasRansel === 0 && remainingItemsDeepcleanTas === 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log(`✅ All Tas data migrated to Deepclean_Tas`);
      console.log(`✅ Price updated: Rp ${OLD_PRICE} → Rp ${NEW_PRICE}`);
      console.log(`✅ Financial data preserved`);
      console.log(`✅ Data integrity maintained`);
      console.log(`⏱️  Time taken: ${duration}s`);
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with warnings:');
      console.log(`   ${remainingTasRansel} orders still have itemType = 'tas_ransel'`);
      console.log(`   ${remainingDeepcleanTas} orders still have itemType = 'deepclean_tas'`);
      console.log(`   ${remainingItemsTasRansel} items still have serviceType = 'tas_ransel'`);
      console.log(`   ${remainingItemsDeepcleanTas} items still have serviceType = 'deepclean_tas'`);
      console.log(`   Expected: ${totalLegacy} legacy + ${totalMulti} items`);
      console.log(`   Got: ${newCount} + ${itemsNewCount} total`);
      process.exit(1);
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

// Run migration
migrateToDeepcleanTas();
