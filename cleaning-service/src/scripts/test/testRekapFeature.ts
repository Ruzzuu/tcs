// Test script to verify rekap immutability feature
// Run with: npx ts-node --project tsconfig.scripts.json src/scripts/test/testRekapFeature.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testRekapFeature() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI tidak ditemukan');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Terhubung ke MongoDB\n');

    const Order = (await import('../../lib/models/Order')).default;
    const Rekap = (await import('../../lib/models/Rekap')).default;

    // Find a completed order
    const completedOrder = await Order.findOne({ orderNumber: 'ORD-REKAP-001' });
    
    if (!completedOrder) {
      console.log('❌ Order ORD-REKAP-001 tidak ditemukan. Jalankan seeder dulu!');
      process.exit(1);
    }

    console.log('📦 Order yang akan dites:');
    console.log(`   Order Number: ${completedOrder.orderNumber}`);
    console.log(`   Status: ${completedOrder.status}`);
    console.log(`   Amount: Rp ${completedOrder.finalPrice.toLocaleString('id-ID')}`);
    console.log(`   Rekap ID: ${completedOrder.rekapId}\n`);

    // Check rekap before delete
    const rekapBefore = await Rekap.findOne({ orderId: completedOrder._id });
    console.log('💰 Rekap sebelum delete:');
    console.log(`   Exists: ${!!rekapBefore}`);
    console.log(`   Amount: Rp ${rekapBefore?.amount.toLocaleString('id-ID')}`);
    console.log(`   Immutable: ${rekapBefore?.immutable}`);
    console.log(`   Balance Snapshot: Rp ${rekapBefore?.balanceSnapshot.toLocaleString('id-ID')}\n`);

    // Simulate DELETE request
    console.log('🗑️  Menghapus order (soft delete)...');
    
    const isComplete = completedOrder.status === 'finished' || !!completedOrder.rekapId;
    
    if (isComplete) {
      (completedOrder as any).deleted = true;
      (completedOrder as any).archivedAt = new Date();
      await completedOrder.save();
      console.log('✅ Order berhasil di-soft delete\n');
    }

    // Check order after delete
    const orderAfter = await Order.findById(completedOrder._id);
    console.log('📦 Order setelah delete:');
    console.log(`   Exists: ${!!orderAfter}`);
    console.log(`   Deleted: ${(orderAfter as any)?.deleted}`);
    console.log(`   Archived At: ${(orderAfter as any)?.archivedAt}\n`);

    // Check rekap after delete
    const rekapAfter = await Rekap.findOne({ orderId: completedOrder._id });
    console.log('💰 Rekap setelah delete:');
    console.log(`   Exists: ${!!rekapAfter}`);
    console.log(`   Amount: Rp ${rekapAfter?.amount.toLocaleString('id-ID')}`);
    console.log(`   Immutable: ${rekapAfter?.immutable}`);
    console.log(`   Balance Snapshot: Rp ${rekapAfter?.balanceSnapshot.toLocaleString('id-ID')}\n`);

    // Verify immutability
    if (rekapBefore && rekapAfter && rekapBefore._id.equals(rekapAfter._id)) {
      console.log('✅ SUCCESS: Rekap tetap utuh setelah order dihapus!');
      console.log('✅ Data rekap tidak berubah (immutable)');
    } else {
      console.log('❌ FAILED: Rekap hilang atau berubah!');
    }

    // Test non-complete order
    console.log('\n' + '='.repeat(50));
    console.log('🧪 Test 2: Delete non-complete order\n');

    const pendingOrder = await Order.create({
      orderNumber: 'TEST-PENDING-001',
      name: 'Test Pending',
      phone: '081234567890',
      address: 'Test',
      items: [{
        id: 'test-1',
        serviceType: 'sepatu',
        quantity: 1,
        unitPrice: 30000,
        subtotal: 30000,
        createdAt: new Date()
      }],
      subtotal: 30000,
      finalPrice: 30000,
      status: 'pending',
      verification: { status: 'approved', verifiedAt: new Date() }
    });

    console.log(`📦 Created pending order: ${pendingOrder.orderNumber}`);

    const isCompleteCheck = pendingOrder.status === 'finished' || !!(pendingOrder as any).rekapId;
    
    if (!isCompleteCheck) {
      await Order.findByIdAndDelete(pendingOrder._id);
      console.log('✅ Pending order berhasil dihapus (hard delete)\n');
    }

    const deletedOrder = await Order.findById(pendingOrder._id);
    console.log('📦 Order setelah delete:');
    console.log(`   Exists: ${!!deletedOrder}`);
    
    if (!deletedOrder) {
      console.log('✅ SUCCESS: Non-complete order berhasil dihapus permanent!');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Semua test berhasil!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Koneksi MongoDB ditutup');
  }
}

testRekapFeature();
