// ============================================
// DATABASE SEED SCRIPT
// Run: npx ts-node --skip-project scripts/seed.ts
// Or: npm run seed
// ============================================

import mongoose from 'mongoose';

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cleaning-service';

// Order Schema (inline for script independence)
const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  itemType: { 
    type: String, 
    required: true,
    enum: ['sepatu', 'tas', 'helm', 'sofa', 'karpet', 'gorden']
  },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  estimatedPrice: { type: Number, required: true },
  finalPrice: { type: Number },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'finished'],
    default: 'pending'
  },
  verification: {
    status: { 
      type: String, 
      enum: ['unverified', 'approved', 'rejected'],
      default: 'unverified'
    },
    verifiedAt: { type: Date }
  },
  beforePhoto: { type: String },
  afterPhoto: { type: String },
  notes: { type: String, default: '' },
  finishedAt: { type: Date },
  expireAt: { type: Date }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// Sample data
const sampleOrders = [
  {
    orderNumber: 'ORD-TEST-001',
    name: 'Budi Santoso',
    phone: '081234567890',
    address: 'Jl. Sudirman No. 10, Jakarta Selatan',
    itemType: 'sepatu',
    quantity: 2,
    estimatedPrice: 70000,
    status: 'pending',
    verification: { status: 'unverified' }
  },
  {
    orderNumber: 'ORD-TEST-002',
    name: 'Siti Rahayu',
    phone: '082345678901',
    address: 'Jl. Gatot Subroto No. 25, Jakarta Pusat',
    itemType: 'tas',
    quantity: 1,
    estimatedPrice: 50000,
    status: 'pending',
    verification: { status: 'unverified' }
  },
  {
    orderNumber: 'ORD-TEST-003',
    name: 'Ahmad Wijaya',
    phone: '083456789012',
    address: 'Jl. Kuningan Raya No. 5',
    itemType: 'helm',
    quantity: 1,
    estimatedPrice: 40000,
    status: 'pending',
    verification: { status: 'approved', verifiedAt: new Date() }
  },
  {
    orderNumber: 'ORD-TEST-004',
    name: 'Dewi Lestari',
    phone: '084567890123',
    address: 'Jl. Senopati No. 15',
    itemType: 'sofa',
    quantity: 1,
    estimatedPrice: 150000,
    status: 'in_progress',
    verification: { status: 'approved', verifiedAt: new Date() },
    notes: 'Sofa 3 seater, warna abu-abu'
  },
  {
    orderNumber: 'ORD-TEST-005',
    name: 'Rudi Hartono',
    phone: '085678901234',
    address: 'Jl. Kemang Raya No. 8',
    itemType: 'karpet',
    quantity: 2,
    estimatedPrice: 200000,
    finalPrice: 200000,
    status: 'finished',
    verification: { status: 'approved', verifiedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    finishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    notes: 'Karpet Persia ukuran besar'
  },
  {
    orderNumber: 'ORD-TEST-006',
    name: 'Maya Sari',
    phone: '086789012345',
    address: 'Jl. BSD Green Office Park',
    itemType: 'gorden',
    quantity: 3,
    estimatedPrice: 225000,
    finalPrice: 225000,
    status: 'finished',
    verification: { status: 'approved', verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
    finishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    orderNumber: 'ORD-TEST-007',
    name: 'Andi Pratama',
    phone: '087890123456',
    address: 'Jl. Pondok Indah No. 20',
    itemType: 'sepatu',
    quantity: 3,
    estimatedPrice: 105000,
    finalPrice: 105000,
    status: 'finished',
    verification: { status: 'approved', verifiedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    finishedAt: new Date()
  }
];

async function seed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional)
    console.log('🗑️  Clearing existing orders...');
    await Order.deleteMany({});

    // Insert sample data
    console.log('📝 Inserting sample orders...');
    await Order.insertMany(sampleOrders);

    console.log(`✅ Successfully seeded ${sampleOrders.length} orders`);

    // Show summary
    const counts = await Order.aggregate([
      {
        $group: {
          _id: '$verification.status',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('\n📊 Summary:');
    counts.forEach(c => {
      console.log(`   ${c._id}: ${c.count}`);
    });

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
