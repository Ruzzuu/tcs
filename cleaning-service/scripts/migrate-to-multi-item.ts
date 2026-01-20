/**
 * Migration Script: Convert Single-Item Orders to Multi-Item Format
 * 
 * This script migrates existing orders from the old single-item format
 * to the new multi-item basket format.
 * 
 * Run with: npm run migrate:multi-item
 */

import mongoose from 'mongoose';
import Order from '../src/lib/models/Order';
import { SERVICES } from '../src/lib/services';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function migrateToMultiItem() {
  try {
    console.log('🚀 Starting migration to multi-item orders...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all orders that don't have items array
    const oldOrders = await Order.find({
      $or: [
        { items: { $exists: false } },
        { items: { $size: 0 } }
      ]
    }).lean();

    console.log(`📊 Found ${oldOrders.length} orders to migrate\n`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const order of oldOrders) {
      try {
        // Skip if already has items
        if (order.items && order.items.length > 0) {
          continue;
        }

        // Skip if order doesn't have required legacy fields
        if (!order.itemType || !order.estimatedPrice) {
          console.log(`⚠️  Skipping order ${order._id} - missing required fields`);
          continue;
        }

        // Create item from legacy fields
        const quantity = order.quantity || 1;
        const unitPrice = order.estimatedPrice / quantity;
        const serviceKey = order.itemType;
        const servicePrice = SERVICES[serviceKey]?.price || unitPrice;

        const item = {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          serviceType: order.itemType,
          quantity: quantity,
          unitPrice: servicePrice,
          subtotal: order.estimatedPrice,
          notes: order.customerNotes || '',
          customItemType: order.customItemType,
          createdAt: order.createdAt
        };

        // Update order with items array
        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {
              items: [item],
              subtotal: order.estimatedPrice,
              finalPrice: order.finalPrice || order.estimatedPrice
            }
          },
          { runValidators: true }
        );

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ Migrated ${successCount} orders...`);
        }
      } catch (err: any) {
        errorCount++;
        errors.push({ orderId: order._id, error: err.message });
        console.error(`❌ Error migrating order ${order._id}:`, err.message);
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      errors.forEach(({ orderId, error }) => {
        console.log(`   - Order ${orderId}: ${error}`);
      });
    }

    console.log(`\n✅ Migration completed!`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('📪 Disconnected from MongoDB');
  }
}

// Rollback function (optional)
async function rollbackMultiItem() {
  try {
    console.log('🔄 Starting rollback from multi-item to single-item...\n');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const orders = await Order.find({ items: { $exists: true, $ne: [] } });

    console.log(`📊 Found ${orders.length} orders to rollback\n`);

    for (const order of orders) {
      if (order.items.length === 1) {
        const item = order.items[0];
        
        await Order.findByIdAndUpdate(
          order._id,
          {
            $set: {
              itemType: item.serviceType,
              quantity: item.quantity,
              estimatedPrice: item.subtotal,
              customItemType: item.customItemType
            },
            $unset: { items: '' }
          }
        );
      }
    }

    console.log('✅ Rollback completed!');

  } catch (err) {
    console.error('❌ Rollback failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run migration
const command = process.argv[2];
if (command === 'rollback') {
  rollbackMultiItem();
} else {
  migrateToMultiItem();
}
