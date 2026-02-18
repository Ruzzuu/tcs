// ============================================
// DEBUG ORDER PRICING ISSUES
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';

async function debugOrderPricing() {
  try {
    await connectDB();
    console.log('✅ Connected to database\n');

    // Find orders with mismatched subtotal and finalPrice
    const ordersWithIssues = await Order.find({
      $expr: {
        $ne: ['$subtotal', '$finalPrice']
      }
    });

    console.log(`📊 Found ${ordersWithIssues.length} orders with pricing issues:\n`);

    if (ordersWithIssues.length === 0) {
      console.log('✨ No pricing issues found!');
      process.exit(0);
    }

    ordersWithIssues.forEach((order: any, i) => {
      console.log(`${i + 1}. Order: ${order.orderNumber}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Subtotal: Rp ${order.subtotal?.toLocaleString('id-ID') || 'N/A'}`);
      console.log(`   FinalPrice: Rp ${order.finalPrice?.toLocaleString('id-ID') || 'N/A'}`);
      console.log(`   Difference: Rp ${Math.abs((order.subtotal || 0) - (order.finalPrice || 0)).toLocaleString('id-ID')}`);

      // Check for discount
      if (order.discount) {
        console.log(`   Discount: ${order.discount.type} (${order.discount.value}${order.discount.type === 'percentage' ? '%' : ''})`);
      } else {
        console.log(`   Discount: None`);
      }

      // Check items
      if (order.items && order.items.length > 0) {
        console.log(`   Items (${order.items.length}):`);
        order.items.forEach((item: any, j: number) => {
          console.log(`     ${j + 1}. ${item.serviceType} - Qty: ${item.quantity} - Unit: Rp ${item.unitPrice?.toLocaleString('id-ID')} - Sub: Rp ${item.subtotal?.toLocaleString('id-ID')}`);
        });
      } else if (order.itemType) {
        console.log(`   Legacy itemType: ${order.itemType} - Qty: ${order.quantity} - Est: Rp ${order.estimatedPrice?.toLocaleString('id-ID')}`);
      }

      console.log();
    });

    // Summary by service type
    console.log('📊 Summary by Service Type:');
    const issuesByService: any = {};
    ordersWithIssues.forEach((order: any) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item: any) => {
          const service = item.serviceType;
          if (!issuesByService[service]) {
            issuesByService[service] = 0;
          }
          issuesByService[service]++;
        });
      } else if (order.itemType) {
        const service = order.itemType;
        if (!issuesByService[service]) {
          issuesByService[service] = 0;
        }
        issuesByService[service]++;
      }
    });

    Object.entries(issuesByService).forEach(([service, count]: any) => {
      console.log(`   ${service}: ${count} orders`);
    });

    console.log('\n✅ Debug completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugOrderPricing();
