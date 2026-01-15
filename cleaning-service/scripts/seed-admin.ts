// ============================================
// SEED ADMIN SCRIPT
// ============================================
// Run with: npx tsx scripts/seed-admin.ts
// Or: node --loader ts-node/esm scripts/seed-admin.ts

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Admin credentials
const ADMIN_USERNAME = 'everyoneherelikelisa';
const ADMIN_PASSWORD = 'temancs251810';
const ADMIN_EMAIL = 'admin@cucipremium.com'; // Default email, can be changed later

// MongoDB connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-connection-string';

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
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
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
    console.log(`   Password: ${ADMIN_PASSWORD}`);
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
