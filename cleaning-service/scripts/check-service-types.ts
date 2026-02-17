// ============================================
// CHECK CURRENT SERVICE TYPES IN DATABASE
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

async function checkServiceTypes() {
  try {
    console.log('🔍 Checking current service types in database...\n');

    await connectDB();
    console.log('✅ Connected to database');

    // Check itemType distribution
    const itemTypeStats = await Order.aggregate([
      {
        $group: {
          _id: '$itemType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('📊 Service Distribution (itemType):');
    itemTypeStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Check items.serviceType distribution
    const itemServiceStats = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.serviceType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📊 Service Distribution (items.serviceType):');
    itemServiceStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });

    // Check prices for each service type
    const priceStats = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.serviceType',
          avgPrice: { $avg: '$items.unitPrice' }
        }
      }
    ]);

    console.log('\n📊 Average Prices by Service Type:');
    priceStats.forEach(stat => {
      if (stat._id && stat.avgPrice) {
        console.log(`   ${stat._id}: Rp ${Math.round(stat.avgPrice).toLocaleString('id-ID')}`);
      }
    });

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkServiceTypes();
