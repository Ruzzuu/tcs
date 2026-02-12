// ============================================
// ADMIN PHONES API - Manage Phone Numbers
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PhoneNumber from '@/lib/models/PhoneNumber';

// GET /api/admin/phones - Get all phone numbers
export async function GET() {
  try {
    await connectDB();

    // Get all phone numbers from PhoneNumber collection
    const phoneDocuments = await PhoneNumber.find({})
      .sort({ phone: -1 }) // Sort descending (higher numbers first)
      .select('phone -_id')
      .lean();

    const phones = phoneDocuments.map(doc => doc.phone);

    return NextResponse.json(phones);
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

// POST /api/admin/phones - Add a new phone number
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { phone } = await request.json();

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existing = await PhoneNumber.findOne({ phone: phone.trim() });
    if (existing) {
      return NextResponse.json(
        { error: 'Phone number already exists' },
        { status: 409 }
      );
    }

    // Create new phone number
    const newPhone = await PhoneNumber.create({ phone: phone.trim() });

    return NextResponse.json({ 
      success: true, 
      phone: newPhone.phone 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding phone number:', error);
    return NextResponse.json(
      { error: 'Failed to add phone number' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/phones - Delete a phone number
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const result = await PhoneNumber.deleteOne({ phone });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Phone number deleted' 
    });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
