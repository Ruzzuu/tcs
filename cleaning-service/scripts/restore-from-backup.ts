// ============================================
// RESTORE DATABASE FROM JSON BACKUPS
// ============================================
// Safe by default: dry-run only.
// Use --apply to write data to MongoDB.

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import type { Model } from 'mongoose';
import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';
import PhoneNumber from '../src/lib/models/PhoneNumber';

type JsonDoc = Record<string, unknown> & { _id?: unknown };

interface RestoreOptions {
  apply: boolean;
  ordersFile?: string;
  phonesFile?: string;
}

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function parseOptions(): RestoreOptions {
  return {
    apply: process.argv.includes('--apply'),
    ordersFile: getArgValue('--orders'),
    phonesFile: getArgValue('--phones'),
  };
}

function latestBackup(prefix: string): string | undefined {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) return undefined;

  return fs
    .readdirSync(backupDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.json'))
    .map((file) => ({
      file: path.join(backupDir, file),
      time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time)[0]?.file;
}

function readJsonArray(filePath: string): JsonDoc[] {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(resolved, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`Backup file must contain a JSON array: ${resolved}`);
  }

  return data as JsonDoc[];
}

async function upsertCollection<T extends object>(
  label: string,
  model: Model<T>,
  docs: JsonDoc[],
  apply: boolean
): Promise<void> {
  console.log(`📦 ${label}: ${docs.length} records found`);

  if (docs.length === 0) return;

  const docsWithId = docs.filter((doc) => doc._id);
  const docsWithoutId = docs.filter((doc) => !doc._id);

  if (docsWithoutId.length > 0) {
    console.warn(`⚠️  ${label}: ${docsWithoutId.length} records do not have _id and will be inserted as new records`);
  }

  if (!apply) {
    console.log(`🔎 Dry-run: ${label} would upsert ${docsWithId.length} and insert ${docsWithoutId.length}`);
    return;
  }

  if (docsWithId.length > 0) {
    const operations = docsWithId.map((doc) => {
      const { _id, ...replacement } = doc;

      return {
        replaceOne: {
          filter: { _id },
          replacement,
          upsert: true,
        },
      };
    }) as unknown as Parameters<typeof model.bulkWrite>[0];

    await model.bulkWrite(operations, { ordered: false });
  }

  if (docsWithoutId.length > 0) {
    await model.insertMany(docsWithoutId as T[], { ordered: false });
  }

  console.log(`✅ ${label}: restore complete`);
}

async function main() {
  const options = parseOptions();

  const ordersFile = options.ordersFile || latestBackup('orders-backup-');
  const phonesFile = options.phonesFile || latestBackup('phones-backup-');

  console.log('🔁 Restore from backup');
  console.log(`Mode: ${options.apply ? 'APPLY (writes to MongoDB)' : 'DRY-RUN (no writes)'}`);
  console.log(`Orders backup: ${ordersFile || 'not found'}`);
  console.log(`Phones backup: ${phonesFile || 'not found'}\n`);

  if (!ordersFile && !phonesFile) {
    throw new Error('No backup files found in backups/');
  }

  const orders = ordersFile ? readJsonArray(ordersFile) : [];
  const phones = phonesFile ? readJsonArray(phonesFile) : [];

  await connectDB();

  await upsertCollection('Orders', Order, orders, options.apply);
  await upsertCollection('Phone numbers', PhoneNumber, phones, options.apply);

  console.log('\nDone.');
  if (!options.apply) {
    console.log('Run again with --apply to write these records to MongoDB.');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Restore failed:', error);
  process.exit(1);
});
