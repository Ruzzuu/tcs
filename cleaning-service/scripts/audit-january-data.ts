// ============================================
// AUDIT JANUARY DATA
// Cross-references the Feb 18 backup against
// live MongoDB to show exactly which orders were
// deleted by the TTL index and which survived.
//
// Usage:
//   npx tsx scripts/audit-january-data.ts
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const BACKUP_FILE = path.join(__dirname, '../backups/orders-backup-2026-02-18T20-36-38.json');
const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function main() {
  // ── Load backup ──────────────────────────────────────────────────
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error('❌ Backup file not found:', BACKUP_FILE);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf-8'));
  const backupOrders: any[] = Array.isArray(raw) ? raw : (raw.orders ?? []);
  console.log(`📦 Backup file loaded: ${backupOrders.length} orders\n`);

  // ── Connect ──────────────────────────────────────────────────────
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri, { bufferCommands: false });
  console.log('✅ Connected\n');

  const col = mongoose.connection.db!.collection('orders');

  // ── Fetch all current order identifiers ─────────────────────────
  const dbOrders = await col.find({}, {
    projection: { _id: 1, orderNumber: 1, createdAt: 1, status: 1, deleted: 1 }
  }).toArray();
  const dbIds  = new Set(dbOrders.map(o => o._id.toString()));
  const dbNums = new Set(dbOrders.map(o => o.orderNumber).filter(Boolean));

  // ── Cross-reference ──────────────────────────────────────────────
  const alive: any[] = [];
  const gone:  any[] = [];

  for (const order of backupOrders) {
    const rawId = order._id?.$oid ?? order._id?.toString() ?? String(order._id ?? '');
    const num   = order.orderNumber;
    const found = (rawId && dbIds.has(rawId)) || (num && dbNums.has(num));
    (found ? alive : gone).push(order);
  }

  // ── Group deleted by month ───────────────────────────────────────
  const byMonth: Record<string, any[]> = {};
  for (const o of gone) {
    const d = new Date(o.createdAt?.$date ?? o.createdAt);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    (byMonth[k] ??= []).push(o);
  }

  // ── Report ───────────────────────────────────────────────────────
  console.log('════════════════════════════════════════════════════');
  console.log('           JANUARY DATA AUDIT REPORT');
  console.log('════════════════════════════════════════════════════\n');

  console.log('📊 Summary:');
  console.log(`   Orders in backup (Feb 18 snapshot) : ${backupOrders.length}`);
  console.log(`   Still alive in MongoDB             : ${alive.length}`);
  console.log(`   Deleted by TTL (GONE)              : ${gone.length}\n`);

  if (Object.keys(byMonth).length > 0) {
    console.log('📅 Deleted orders by month:');
    for (const [k, orders] of Object.entries(byMonth).sort()) {
      const [year, month] = k.split('-');
      console.log(`   ${(MONTHS[+month] + ' ' + year).padEnd(12)}: ${orders.length} orders permanently deleted`);
    }
    console.log('');
  }

  if (gone.length > 0) {
    console.log('🗑️  Full list of DELETED orders (TTL victims):');
    console.log('   ' + '─'.repeat(72));
    for (const o of gone) {
      const created   = new Date(o.createdAt?.$date ?? o.createdAt).toLocaleDateString('id-ID');
      const expiredOn = o.expireAt
        ? new Date(o.expireAt?.$date ?? o.expireAt).toLocaleDateString('id-ID')
        : 'no expireAt';
      const items = o.items
        ? o.items.map((i: any) => `${i.serviceType} x${i.quantity}`).join(', ')
        : (o.itemType ?? 'unknown');
      const price = (o.finalPrice ?? o.estimatedPrice ?? 0).toLocaleString('id-ID');
      console.log(`   [${(o.orderNumber ?? '?').padEnd(8)}] ${(o.name ?? '?').padEnd(20)} | ${created} | ${expiredOn} | Rp ${price} | ${items}`);
    }
    console.log('');
  }

  console.log('✅ Orders still alive in DB:');
  console.log('   ' + '─'.repeat(72));
  for (const o of alive) {
    const created = new Date(o.createdAt?.$date ?? o.createdAt).toLocaleDateString('id-ID');
    const items = o.items
      ? o.items.map((i: any) => `${i.serviceType} x${i.quantity}`).join(', ')
      : (o.itemType ?? 'unknown');
    const price = (o.finalPrice ?? o.estimatedPrice ?? 0).toLocaleString('id-ID');
    console.log(`   [${(o.orderNumber ?? '?').padEnd(8)}] ${(o.name ?? '?').padEnd(20)} | ${created} | status: ${o.status} | Rp ${price} | ${items}`);
  }
  console.log('');

  // ── Revenue lost to TTL ──────────────────────────────────────────
  if (gone.length > 0) {
    const lostRevenue = gone.reduce((sum: number, o: any) => sum + (o.finalPrice ?? o.estimatedPrice ?? 0), 0);
    console.log(`💸 Estimated revenue in deleted orders: Rp ${lostRevenue.toLocaleString('id-ID')}`);
    console.log('   (These cannot be recovered — the documents are permanently gone from MongoDB)\n');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected.');
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
