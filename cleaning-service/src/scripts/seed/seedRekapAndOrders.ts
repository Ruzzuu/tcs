// Run with: npx ts-node --project tsconfig.scripts.json src/scripts/seed/seedRekapAndOrders.ts
// Or: npm run seed:rekap (add to package.json: "seed:rekap": "ts-node --project tsconfig.scripts.json src/scripts/seed/seedRekapAndOrders.ts")

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function seedRekapAndOrders() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI tidak ditemukan di .env.local');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Terhubung ke MongoDB');

    const Order = (await import('../../lib/models/Order')).default;
    const Rekap = (await import('../../lib/models/Rekap')).default;

    const sampleOrders = [
      {
        orderNumber: 'ORD-REKAP-001',
        name: 'Budi Santoso',
        phone: '081234567890',
        address: 'Jl. Merdeka No. 123',
        items: [
          {
            id: 'item-1',
            serviceType: 'sepatu',
            quantity: 2,
            unitPrice: 35000,
            subtotal: 70000,
            notes: 'Deep clean'
          }
        ],
        subtotal: 70000,
        finalPrice: 70000,
        status: 'finished',
        verification: {
          status: 'approved',
          verifiedAt: new Date()
        },
        finishedAt: new Date(),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        orderNumber: 'ORD-REKAP-002',
        name: 'Siti Nurhaliza',
        phone: '081298765432',
        address: 'Jl. Sudirman No. 456',
        items: [
          {
            id: 'item-1',
            serviceType: 'tas_ransel',
            quantity: 1,
            unitPrice: 45000,
            subtotal: 45000
          }
        ],
        subtotal: 45000,
        finalPrice: 45000,
        status: 'finished',
        verification: {
          status: 'approved',
          verifiedAt: new Date()
        },
        finishedAt: new Date(),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        orderNumber: 'ORD-REKAP-003',
        name: 'Ahmad Dahlan',
        phone: '081345678901',
        address: 'Jl. Gatot Subroto No. 789',
        items: [
          {
            id: 'item-1',
            serviceType: 'helm',
            quantity: 3,
            unitPrice: 25000,
            subtotal: 75000
          }
        ],
        subtotal: 75000,
        finalPrice: 75000,
        status: 'finished',
        verification: {
          status: 'approved',
          verifiedAt: new Date()
        },
        finishedAt: new Date(),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    console.log('🗑️  Menghapus data lama...');
    await Order.deleteMany({ orderNumber: /^ORD-REKAP-/ });
    await Rekap.deleteMany({});

    let cumulativeBalance = 0;

    for (const orderData of sampleOrders) {
      const order = await Order.create(orderData);
      console.log(`✅ Order dibuat: ${order.orderNumber}`);

      const amount = order.finalPrice ?? order.subtotal ?? 0;
      cumulativeBalance += amount;

      const rekap = await Rekap.create({
        orderId: order._id,
        amount,
        immutable: true,
        balanceSnapshot: cumulativeBalance,
        createdAt: order.createdAt
      });

      (order as any).rekapId = rekap._id as mongoose.Types.ObjectId;
      await order.save();

      console.log(`✅ Rekap dibuat: Rp ${amount.toLocaleString('id-ID')} (Balance: Rp ${cumulativeBalance.toLocaleString('id-ID')})`);
    }

    console.log('\n✅ Seeding selesai!');
    console.log(`📊 Total orders: ${sampleOrders.length}`);
    console.log(`💰 Total balance: Rp ${cumulativeBalance.toLocaleString('id-ID')}`);
    console.log('\n🧪 Test: Coba hapus order dengan status "finished" - Rekap tetap tersimpan!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Koneksi MongoDB ditutup');
  }
}

seedRekapAndOrders();
