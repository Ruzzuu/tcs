// ============================================
// BACKUP DATABASE - EXPORT ALL ORDERS
// ============================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';
import PhoneNumber from '../src/lib/models/PhoneNumber';

async function backupDatabase() {
  const startTime = Date.now();

  try {
    console.log('💾 Starting database backup...\n');

    await connectDB();
    console.log('✅ Connected to database\n');

    // Create backups directory if it doesn't exist
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('📁 Created backups directory\n');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // Backup orders
    console.log('📦 Exporting orders...');
    const orders = await Order.find({}).lean();
    const ordersFile = path.join(backupDir, `orders-backup-${timestamp}.json`);

    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    const ordersSize = (fs.statSync(ordersFile).size / 1024).toFixed(2);
    console.log(`✅ Orders exported: ${orders.length} orders (${ordersSize} KB)`);
    console.log(`   Location: ${ordersFile}\n`);

    // Backup phone numbers
    console.log('📱 Exporting phone numbers...');
    const phoneNumbers = await PhoneNumber.find({}).lean();
    const phonesFile = path.join(backupDir, `phones-backup-${timestamp}.json`);

    fs.writeFileSync(phonesFile, JSON.stringify(phoneNumbers, null, 2));
    const phonesSize = (fs.statSync(phonesFile).size / 1024).toFixed(2);
    console.log(`✅ Phone numbers exported: ${phoneNumbers.length} phones (${phonesSize} KB)`);
    console.log(`   Location: ${phonesFile}\n`);

    // Clean up old backups (keep last 5)
    console.log('🧹 Cleaning up old backups...');
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 10) {
      const filesToDelete = files.slice(10);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`   Deleted old backup: ${file.name}`);
      });
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('╔══════════════════════════════════════════╗');
    console.log('║          BACKUP COMPLETE                   ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Orders backed up: ${orders.length}`);
    console.log(`   Phone numbers backed up: ${phoneNumbers.length}`);
    console.log(`   Backup location: ${backupDir}`);
    console.log('\n✅ Backup completed successfully!\n');

    process.exit(0);

  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.error('\n❌ Backup failed!');
    console.error(`   Duration: ${duration}s`);
    console.error(`   Error:`, error);

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

backupDatabase();
