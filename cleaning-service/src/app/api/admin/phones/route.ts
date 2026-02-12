// ============================================
// ADMIN PHONES API - Get Unique Phone Numbers
// ============================================

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';

// GET /api/admin/phones - Get all unique phone numbers
export async function GET() {
  try {
    await connectDB();

    // Get distinct phone numbers from approved orders
    // Exclude deleted orders and sort by most recent
    const phones = await Order.distinct('phone', {
      'verification.status': 'approved',
      deleted: { $ne: true }
    });

    // Remove any empty/null values and sort
    const validPhones = phones
      .filter((phone: string) => phone && phone.trim())
      .sort()
      .reverse(); // Most recent pattern (higher numbers first)

    return NextResponse.json(validPhones);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}
