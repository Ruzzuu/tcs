// Quick database check script to see actual order structure
import mongoose from 'mongoose';

// Get MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env.local');
  process.exit(1);
}

// TypeScript now knows MONGODB_URI is defined
const dbUri: string = MONGODB_URI;

// Define Order schema inline to avoid import issues
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  name: String,
  phone: String,
  status: String,
  items: Array,
  itemType: String,
  createdAt: Date,
  // ... other fields
}, { strict: false });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

async function checkOrders() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbUri);
    console.log('✅ Connected!\n');

    // Get the two orders from the screenshot
    console.log('📋 Checking orders from phone: 08123131231213\n');
    
    const orders = await Order.find({ 
      phone: '08123131231213' 
    }).sort({ createdAt: -1 }).limit(5).lean();

    console.log(`Found ${orders.length} orders:\n`);
    
    orders.forEach((order: any, index: number) => {
      console.log(`Order ${index + 1}:`);
      console.log(`  Order Number: ${order.orderNumber}`);
      console.log(`  Name: ${order.name}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log(`  Has items array: ${!!order.items}`);
      console.log(`  Items length: ${order.items?.length || 0}`);
      console.log(`  Legacy itemType: ${order.itemType || 'N/A'}`);
      
      if (order.items && order.items.length > 0) {
        console.log(`  Items detail:`);
        order.items.forEach((item: any, i: number) => {
          console.log(`    ${i + 1}. Type: ${item.itemType || 'undefined'}`);
          console.log(`       Price: Rp ${item.price?.toLocaleString() || '0'}`);
          console.log(`       Quantity: ${item.quantity}`);
          console.log(`       Subtotal: Rp ${item.subtotal?.toLocaleString() || '0'}`);
        });
      }
      console.log('');
    });

    // Check feature flags from database (if there's a config collection)
    console.log('\n🚩 Checking environment variables that would be used:');
    console.log(`  NEXT_PUBLIC_FEATURE_MULTI_ITEM: ${process.env.NEXT_PUBLIC_FEATURE_MULTI_ITEM || 'NOT SET'}`);
    console.log(`  NEXT_PUBLIC_FEATURE_AUTO_MERGE: ${process.env.NEXT_PUBLIC_FEATURE_AUTO_MERGE || 'NOT SET'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkOrders();
