// ============================================
// MIGRATE CONTACTS API - Trigger Migration
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import PhoneNumber from '@/lib/models/PhoneNumber';
import { isAdminAuthenticated } from '@/lib/adminAuth';

// Legacy phone numbers to exclude from migration
const EXCLUDED_PHONES = [
  '81515263851',
  '085859461424',
  '085731854878'
];

// POST /api/admin/migrate-phones - Rebuild saved contact suggestions from orders
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔄 Starting contact suggestions migration...');
    
    await connectDB();
    console.log('✅ Connected to database');

    // Get all distinct contact values from approved orders
    const phones = await Order.distinct('phone', {
      'verification.status': 'approved',
      deleted: { $ne: true }
    });

    console.log(`📊 Found ${phones.length} total contacts in orders`);

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

    console.log(`✅ Filtered to ${validPhones.length} valid contacts (excluded ${phones.length - validPhones.length})`);

    // Clear existing saved contacts collection
    const deleteResult = await PhoneNumber.deleteMany({});
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing contacts`);

    // Insert saved contacts
    const phoneDocuments = validPhones.map(phone => ({ phone }));
    
    let insertedCount = 0;
    if (phoneDocuments.length > 0) {
      try {
        const result = await PhoneNumber.insertMany(phoneDocuments, { 
          ordered: false,
        });
        insertedCount = Array.isArray(result) ? result.length : 0;
        console.log(`✅ Inserted ${insertedCount} contacts into database`);
      } catch (err: any) {
        // Handle duplicate key errors gracefully
        if (err.code === 11000) {
          insertedCount = phoneDocuments.length - (err.writeErrors?.length || 0);
          console.log(`⚠️  Some duplicate contacts were skipped, inserted ${insertedCount} unique contacts`);
        } else {
          throw err;
        }
      }
    }

    // Verify final count
    const finalCount = await PhoneNumber.countDocuments();
    console.log(`📊 Final contacts count: ${finalCount}`);

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      stats: {
        totalFound: phones.length,
        excluded: phones.length - validPhones.length,
        inserted: insertedCount,
        final: finalCount
      }
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    );
  }
}
