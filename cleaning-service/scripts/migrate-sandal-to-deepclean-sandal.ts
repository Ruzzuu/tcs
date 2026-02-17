// ============================================
// MIGRATE SANDAL TO DEEPCLEAN_SANDAL
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

async function migrateSandalToDeepcleanSandal() {
  const startTime = Date.now();

  try {
    console.log('🔄 Starting migration: sandal → Deepclean_Sandal');
    console.log(`📅 Started at: ${new Date().toISOString()}`);

    await connectDB();
    console.log('✅ Connected to database');

    const OLD_VALUE = 'sandal';
    const NEW_VALUE = 'Deepclean_Sandal';
    const OLD_PRICE = 25000;
    const NEW_PRICE = 25000; // Same price

    // STEP 1: COUNT LEGACY ORDERS
    const legacyCount = await Order.countDocuments({ itemType: OLD_VALUE });
    console.log(`📊 Found ${legacyCount} legacy orders with itemType = 'sandal'`);

    // STEP 2: COUNT MULTI-ITEM ORDERS
    const multiItemCount = await Order.countDocuments({ 'items.serviceType': OLD_VALUE });
    console.log(`📊 Found ${multiItemCount} items in multi-item orders with serviceType = 'sandal'`);

    if (legacyCount === 0 && multiItemCount === 0) {
      console.log('✨ No migrations needed - no sandal values found');
      process.exit(0);
    }

    // STEP 3: UPDATE LEGACY ORDERS (itemType)
    let legacyUpdated = 0;
    if (legacyCount > 0) {
      const result = await Order.updateMany(
        { itemType: OLD_VALUE },
        { $set: { itemType: NEW_VALUE } }
      );
      legacyUpdated = result.modifiedCount;
      console.log(`✅ Updated ${legacyUpdated} legacy orders: sandal → Deepclean_Sandal`);
      console.log(`✅ Price unchanged: Rp ${OLD_PRICE}`);
    }

    // STEP 4: UPDATE MULTI-ITEM ORDERS (serviceType + price)
    let itemsUpdated = 0;
    if (multiItemCount > 0) {
      // For each order with sandal items, update those specific items only
      const ordersToUpdate = await Order.find({ 'items.serviceType': OLD_VALUE });
      
      for (const order of ordersToUpdate) {
        // Find the specific items with itemType = 'sandal'
        const sandalItems = order.items?.filter(item => item.serviceType === 'sandal') || [];
        
        if (sandalItems.length > 0) {
          // Update only the sandal items (not other items)
          const updatedItems = sandalItems.map(item => {
            if (item.serviceType === 'sandal') {
              return { ...item, serviceType: 'Deepclean_Sandal' };
            }
            return item;
          });

          await Order.updateOne(
            { _id: order._id },
            { $set: { items: updatedItems } }
          );

          itemsUpdated++;
        }
      }
      
      console.log(`✅ Updated ${itemsUpdated} orders with sandal items → Deepclean_Sandal`);
    }

    // STEP 5: VERIFICATION
    const remainingLegacy = await Order.countDocuments({ itemType: OLD_VALUE });
    const remainingItems = await Order.countDocuments({ 'items.serviceType': OLD_VALUE });
    const newCount = await Order.countDocuments({ itemType: NEW_VALUE });
    const itemsNewCount = await Order.countDocuments({ 'items.serviceType': NEW_VALUE });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n📊 Migration Summary:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Legacy orders updated: ${legacyUpdated}`);
    console.log(`   Multi-item orders updated: ${itemsUpdated}`);
    console.log(`   Total documents affected: ${legacyUpdated + itemsUpdated}`);
    console.log(`\n🔍 Verification:`);
    console.log(`   Before: sandal (${legacyCount + multiItemCount})`);
    console.log(`   After: Deepclean_Sandal (${newCount + itemsNewCount})`);
    console.log(`   Remaining sandal (itemType): ${remainingLegacy}`);
    console.log(`   Remaining sandal (items.serviceType): ${remainingItems}`);

    if (remainingLegacy === 0 && remainingItems === 0 && legacyCount === newCount && multiItemCount === itemsNewCount) {
      console.log('\n✨ Migration completed successfully!');
      console.log(`✅ All sandal values migrated to Deepclean_Sandal`);
      console.log(`✅ Price unchanged: Rp ${OLD_PRICE}`);
      console.log(`⏱️  Time taken: ${duration}s`);
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with warnings:');
      console.log(`   ${remainingLegacy} orders still have itemType = 'sandal'`);
      console.log(`   ${remainingItems} items still have serviceType = 'sandal'`);
      console.log(`   Expected: ${legacyCount} legacy + multiItemCount} orders`);
      console.log(`   Got: ${newCount} + itemsNewCount} total`);
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
migrateSandalToDeepcleanSandal();
