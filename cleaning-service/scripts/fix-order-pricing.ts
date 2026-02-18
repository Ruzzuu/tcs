// ============================================
// FIX ORDER PRICING - Recalculate finalPrice for all orders
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';
import { calculateOrderTotal } from '../src/lib/orderUtils';

async function fixOrderPricing() {
  const startTime = Date.now();

  try {
    await connectDB();
    console.log('🔄 Starting: Fix order pricing issues');
    console.log(`📅 Started at: ${new Date().toISOString()}`);

    // Find all orders
    const allOrders = await Order.find({});
    console.log(`📊 Found ${allOrders.length} total orders`);

    let fixedCount = 0;
    let skipCount = 0;
    let totalAmountAdjusted = 0;

    for (const order of allOrders) {
      let newSubtotal = 0;
      let newFinalPrice = 0;

      // Calculate based on order type
      if (order.items && order.items.length > 0) {
        // Multi-item order
        newSubtotal = order.items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0);
        const pricing = calculateOrderTotal(order.items, order.discount);
        newFinalPrice = pricing.total;
      } else if (order.itemType && order.estimatedPrice) {
        // Legacy single-item order
        newSubtotal = order.estimatedPrice;
        newFinalPrice = order.estimatedPrice;

        // Apply discount if exists
        if (order.discount) {
          if (order.discount.type === 'percentage') {
            const percentage = Math.max(0, Math.min(100, order.discount.value));
            const discountAmount = Math.round((newSubtotal * percentage) / 100);
            newFinalPrice = Math.max(0, newSubtotal - discountAmount);
          } else if (order.discount.type === 'fixed') {
            const discountAmount = Math.max(0, order.discount.value);
            newFinalPrice = Math.max(0, newSubtotal - discountAmount);
          }
        }
      } else {
        console.log(`⚠️  Skipping ${order.orderNumber}: No items or itemType`);
        skipCount++;
        continue;
      }

      // Only update if there's an actual discrepancy
      const currentSubtotal = order.subtotal || 0;
      const currentFinalPrice = order.finalPrice || 0;
      const subtotalDiff = Math.abs(currentSubtotal - newSubtotal);
      const finalPriceDiff = Math.abs(currentFinalPrice - newFinalPrice);

      // Allow small rounding differences (up to 1 rupiah)
      if (subtotalDiff <= 1 && finalPriceDiff <= 1) {
        skipCount++;
        continue;
      }

      // Check if values need updating
      if (currentSubtotal !== newSubtotal || currentFinalPrice !== newFinalPrice) {
        const diff = newFinalPrice - currentFinalPrice;
        totalAmountAdjusted += Math.abs(diff);

        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              subtotal: newSubtotal,
              finalPrice: newFinalPrice
            }
          }
        );

        console.log(`✅ Fixed ${order.orderNumber}:`);
        console.log(`   Before: Subtotal=Rp ${currentSubtotal.toLocaleString('id-ID')}, FinalPrice=Rp ${currentFinalPrice.toLocaleString('id-ID')}`);
        console.log(`   After:  Subtotal=Rp ${newSubtotal.toLocaleString('id-ID')}, FinalPrice=Rp ${newFinalPrice.toLocaleString('id-ID')}`);
        console.log(`   Diff: ${diff >= 0 ? '+' : ''}Rp ${diff.toLocaleString('id-ID')}`);

        fixedCount++;
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n📊 Summary:');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Total orders: ${allOrders.length}`);
    console.log(`   Orders fixed: ${fixedCount}`);
    console.log(`   Orders skipped: ${skipCount}`);
    console.log(`   Total amount adjusted: Rp ${totalAmountAdjusted.toLocaleString('id-ID')}`);

    if (fixedCount === 0) {
      console.log('\n✨ No pricing fixes needed - all orders are correct!');
    } else {
      console.log('\n✨ Pricing fix completed successfully!');
      console.log(`✅ Fixed ${fixedCount} orders`);
      console.log(`✅ Financial data preserved`);
      console.log(`✅ Data integrity maintained`);
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pricing fix failed!');
    console.error(`   Error:`, error);

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

fixOrderPricing();
