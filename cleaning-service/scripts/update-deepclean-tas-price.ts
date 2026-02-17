// ============================================
// UPDATE DEEPCLEAN_TAS PRICE TO Rp 45.000
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

async function updateDeepcleanTasPrice() {
  const startTime = Date.now();

  try {
    console.log('🔄 Starting: Update deepclean_tas price to Rp 45.000');
    console.log(`📅 Started at: ${new Date().toISOString()}`);

    await connectDB();
    console.log('✅ Connected to database');

    const OLD_PRICE = 40000;
    const NEW_PRICE = 45000;

    // STEP 1: FIND ORDERS WITH DEEPCLEAN_TAS ITEMS
    console.log('🔍 Finding orders with deepclean_tas items...');

    const ordersToUpdate = await Order.find({
      'items.serviceType': 'deepclean_tas'
    });

    console.log(`📊 Found ${ordersToUpdate.length} orders with deepclean_tas items`);

    if (ordersToUpdate.length === 0) {
      console.log('✨ No orders to update');
      process.exit(0);
    }

    // STEP 2: UPDATE PRICES
    let itemsUpdated = 0;
    for (const order of ordersToUpdate) {
      // Update each item's unitPrice and recalculate subtotal
      const updatedItems = order.items!.map(item => {
        if (item.serviceType === 'deepclean_tas') {
          return {
            ...item,
            unitPrice: NEW_PRICE,
            subtotal: item.quantity * NEW_PRICE
          };
        }
        return item;
      });

      await Order.updateOne(
        { _id: order._id },
        { $set: { items: updatedItems } }
      );

      itemsUpdated++;
      console.log(`✅ Updated order ${order.orderNumber}: ${order.items!.filter(i => i.serviceType === 'deepclean_tas').length} items`);
    }

    // STEP 3: VERIFY PRICES
    const itemsWithPrice = await Order.find({
      'items.serviceType': 'deepclean_tas',
      'items.unitPrice': NEW_PRICE
    });

    const itemCount = itemsWithPrice.reduce((sum, order) => {
      return sum + (order.items?.filter(i => i.serviceType === 'deepclean_tas').length || 0);
    }, 0);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n📊 Migration Summary:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Orders updated: ${itemsUpdated}`);
    console.log(`   Total items updated: ${itemCount}`);

    console.log(`\n🔍 Verification:`);
    console.log(`   Total items with new price (Rp ${NEW_PRICE}): ${itemsWithPrice.length}`);

    if (itemsWithPrice.length === itemCount) {
      console.log('\n✨ Price update completed successfully!');
      console.log(`✅ Price updated: Rp ${OLD_PRICE} → Rp ${NEW_PRICE}`);
      console.log(`⏱️  Time taken: ${duration}s`);
      process.exit(0);
    } else {
      console.log('\n⚠️  Verification failed');
      console.log(`   Expected: ${itemCount} items`);
      console.log(`   Got: ${itemsWithPrice.length} items`);
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
updateDeepcleanTasPrice();
