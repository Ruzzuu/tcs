// ============================================
// MONGODB CONNECTION
// Singleton pattern for connection reuse
// ============================================

import mongoose from 'mongoose';
import { ACTIVE_TENANT } from '@/config/tenant';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Extend global to include mongoose cache
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Read MONGODB_URI at runtime, not module load time
    const MONGODB_URI = process.env.MONGODB_URI;

    if (!MONGODB_URI) {
      // In development, we'll use a fallback for testing
      console.warn('Warning: MONGODB_URI not defined. Using local MongoDB.');
    }

    const uri = MONGODB_URI || 'mongodb://localhost:27017/cleaning-service';
    const configuredDatabaseName = process.env.MONGODB_DB_NAME?.trim();
    const databaseName = configuredDatabaseName || ACTIVE_TENANT.databaseName;

    if (!/^[a-zA-Z0-9_-]+$/.test(databaseName)) {
      throw new Error('MONGODB_DB_NAME contains unsupported characters');
    }

    if (configuredDatabaseName && configuredDatabaseName !== ACTIVE_TENANT.databaseName) {
      throw new Error(
        `MONGODB_DB_NAME does not match tenant ${ACTIVE_TENANT.id}; expected ${ACTIVE_TENANT.databaseName}`
      );
    }
    
    const opts = {
      bufferCommands: false,
      dbName: databaseName,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongoose) => {
      console.log(`✅ MongoDB connected for tenant ${ACTIVE_TENANT.id}${databaseName ? ` (${databaseName})` : ''}`);
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
