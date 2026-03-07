// ============================================
// FIX TTL INDEX
// Drops the expireAt TTL index and strips the
// expireAt field from all surviving orders.
//
// Usage:
//   Dry run (read-only, safe):
//     npx tsx scripts/fix-ttl-index.ts
//
//   Apply the fix:
//     npx tsx scripts/fix-ttl-index.ts --fix
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import mongoose from 'mongoose';

const DRY_RUN = !process.argv.includes('--fix');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri, { bufferCommands: false });
  console.log('✅ Connected\n');

  const db = mongoose.connection.db!;
  const ordersCol = db.collection('orders');

  // ── 1. List all indexes ──────────────────────────────────────────
  console.log('📋 Current indexes on "orders" collection:');
  const indexes = await ordersCol.indexes();
  let ttlIndexFound = false;
  for (const idx of indexes) {
    const isTTL = idx.expireAfterSeconds !== undefined;
    console.log(`   ${idx.name}${isTTL ? '  ⚠️  TTL INDEX ← THIS IS THE CULPRIT' : ''}`);
    if (isTTL) ttlIndexFound = true;
  }
  console.log('');

  // ── 2. Count orders at risk ──────────────────────────────────────
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const totalOrders    = await ordersCol.countDocuments({});
  const noExpireAt     = await ordersCol.countDocuments({ expireAt: { $exists: false } });
  const alreadyExpired = await ordersCol.countDocuments({ expireAt: { $lt: now } });
  const expiringSoon   = await ordersCol.countDocuments({ expireAt: { $gte: now, $lt: in7Days } });
  const safeLater      = await ordersCol.countDocuments({ expireAt: { $gte: in7Days } });

  console.log('📊 expireAt field status across all orders:');
  console.log(`   Total orders in DB          : ${totalOrders}`);
  console.log(`   No expireAt (already safe)  : ${noExpireAt}`);
  console.log(`   expireAt already passed     : ${alreadyExpired}  ⚠️  (may have been swept by TTL!)`);
  console.log(`   expireAt within 7 days      : ${expiringSoon}  🔴 AT RISK right now!`);
  console.log(`   expireAt > 7 days (safe)    : ${safeLater}`);
  console.log('');

  // ── 3. Orders per month (gap detection) ─────────────────────────
  const byMonth = await ordersCol.aggregate([
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]).toArray();

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  console.log('📅 Orders per month currently in DB:');
  for (const row of byMonth) {
    const label = `${MONTHS[row._id.month - 1]} ${row._id.year}`;
    console.log(`   ${label.padEnd(12)}: ${row.count} orders`);
  }
  console.log('');

  // ── 4. Apply fix (only with --fix flag) ──────────────────────────
  if (DRY_RUN) {
    console.log('ℹ️  DRY RUN — no changes made to the database.');
    if (ttlIndexFound || expiringSoon > 0 || alreadyExpired > 0) {
      console.log('\n🔴 ACTION REQUIRED:');
      if (ttlIndexFound)    console.log('   • TTL index "expireAt_1" is ACTIVE and deleting your data');
      if (alreadyExpired)   console.log(`   • ${alreadyExpired} orders have an already-passed expireAt (were targeted for deletion)`);
      if (expiringSoon > 0) console.log(`   • ${expiringSoon} orders will be deleted within 7 days if not fixed!`);
      console.log('\n👉 Run with --fix to drop the index and protect your data:');
      console.log('   npx tsx scripts/fix-ttl-index.ts --fix\n');
    } else {
      console.log('✅ No TTL index found, no orders at risk. Nothing to fix.');
    }
  } else {
    console.log('🔧 APPLYING FIX...\n');

    // Step A: Drop TTL index
    if (ttlIndexFound) {
      try {
        await ordersCol.dropIndex('expireAt_1');
        console.log('✅ Dropped TTL index "expireAt_1"');
      } catch (err: any) {
        console.warn('⚠️  Could not drop expireAt_1 (may already be gone):', err.message);
      }
    } else {
      console.log('ℹ️  TTL index "expireAt_1" was not found — may already be gone');
    }

    // Step B: Unset expireAt from all surviving orders
    const unsetResult = await ordersCol.updateMany(
      { expireAt: { $exists: true } },
      { $unset: { expireAt: '' } }
    );
    console.log(`✅ Removed expireAt field from ${unsetResult.modifiedCount} orders`);

    // Step C: Confirm result
    console.log('\n📋 Indexes after fix:');
    const indexesAfter = await ordersCol.indexes();
    for (const idx of indexesAfter) {
      const isTTL = idx.expireAfterSeconds !== undefined;
      console.log(`   ${idx.name}${isTTL ? '  ⚠️  TTL STILL EXISTS!' : ''}`);
    }

    const remainingTTL = indexesAfter.find(i => i.expireAfterSeconds !== undefined);
    if (remainingTTL) {
      console.log('\n🔴 WARNING: A TTL index still exists! Drop it manually via Atlas UI.');
    } else {
      console.log('\n✅ SUCCESS: No TTL indexes remain. Your orders are now safe from auto-deletion.');
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected.\n');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
