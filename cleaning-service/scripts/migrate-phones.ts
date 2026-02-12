// ============================================
// MIGRATE PHONE NUMBERS - Import from Orders
// ============================================

import connectDB from '../src/lib/mongodb';
import Order from '../src/lib/models/Order';
import PhoneNumber from '../src/lib/models/PhoneNumber';

// Phone numbers to exclude from migration
const EXCLUDED_PHONES = [
  '81515263851',
  '085859461424', 
  '085731854878'
];

async function migratePhoneNumbers() {
  try {
    console.log('🔄 Starting phone numbers migration...');
    
    await connectDB();
    console.log('✅ Connected to database');

    // Get all distinct phone numbers from approved orders
    const phones = await Order.distinct('phone', {
      'verification.status': 'approved',
      deleted: { $ne: true }
    });

    console.log(`📊 Found ${phones.length} total phone numbers in orders`);

    // Filter out excluded phones and empty values
    const validPhones = phones.filter((phone: string) => {
      if (!phone || !phone.trim()) return false;
      
      // Check if phone matches any excluded number (with or without leading 0)
      const cleanPhone = phone.replace(/^0/, ''); // Remove leading 0 for comparison
      const isExcluded = EXCLUDED_PHONES.some(excluded => {
        const cleanExcluded = excluded.replace(/^0/, '');
        return cleanPhone === cleanExcluded || phone === excluded;
      });
      
      return !isExcluded;
    });

    console.log(`✅ Filtered to ${validPhones.length} valid phone numbers (excluded ${phones.length - validPhones.length})`);

    // Clear existing phone numbers collection
    await PhoneNumber.deleteMany({});
    console.log('🗑️  Cleared existing phone numbers');

    // Insert phone numbers (using insertMany with ordered: false to continue on duplicates)
    const phoneDocuments = validPhones.map(phone => ({ phone }));
    
    let insertedCount = 0;
    if (phoneDocuments.length > 0) {
      try {
        const result = await PhoneNumber.insertMany(phoneDocuments, { 
          ordered: false,
        });
        insertedCount = Array.isArray(result) ? result.length : 0;
        console.log(`✅ Inserted ${insertedCount} phone numbers into database`);
      } catch (err: any) {
        // Handle duplicate key errors gracefully
        if (err.code === 11000) {
          insertedCount = phoneDocuments.length - (err.writeErrors?.length || 0);
          console.log(`⚠️  Some duplicate phones were skipped, inserted ${insertedCount} unique numbers`);
        } else {
          throw err;
        }
      }
    }

    // Verify final count
    const finalCount = await PhoneNumber.countDocuments();
    console.log(`📊 Final phone numbers count: ${finalCount}`);

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migratePhoneNumbers();
