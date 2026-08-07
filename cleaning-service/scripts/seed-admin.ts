// ============================================
// SEED ADMIN SCRIPT
// ============================================
// Run with: npx tsx scripts/seed-admin.ts
// Or: node --loader ts-node/esm scripts/seed-admin.ts

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Required runtime configuration. Never hardcode admin or database credentials.
const ADMIN_USERNAME = process.env.ADMIN_SEED_USERNAME?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME?.trim();

// Admin Schema (same as in src/lib/models/Admin.ts)
const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  sessionVersion: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);

async function seedAdmin() {
  try {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_EMAIL || !MONGODB_URI || !MONGODB_DB_NAME) {
      throw new Error(
        'ADMIN_SEED_USERNAME, ADMIN_SEED_PASSWORD, ADMIN_SEED_EMAIL, MONGODB_URI, and MONGODB_DB_NAME are required'
      );
    }

    if (ADMIN_PASSWORD.length < 8) {
      throw new Error('ADMIN_SEED_PASSWORD must contain at least 8 characters');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({});
    
    if (existingAdmin) {
      console.log('⚠️  Admin already exists:');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log('');
      console.log('If you want to reset the admin, delete it first:');
      console.log('   db.admins.deleteMany({})');
      
      await mongoose.disconnect();
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Create admin
    console.log('👤 Creating admin...');
    const admin = new Admin({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      passwordHash,
      sessionVersion: 0,
    });

    await admin.save();

    console.log('');
    console.log('✅ Admin created successfully!');
    console.log('================================');
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log('================================');
    console.log('');
    console.log('⚠️  Remember to set these environment variables in Vercel:');
    console.log('   - JWT_SECRET: (generate a strong random string)');
    console.log('   - ADMIN_RECOVERY_KEY: (save this securely for lockout recovery)');

    await mongoose.disconnect();
    console.log('');
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
