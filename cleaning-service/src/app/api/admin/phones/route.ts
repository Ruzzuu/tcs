// ============================================
// ADMIN CONTACTS API - Manage saved contacts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PhoneNumber from '@/lib/models/PhoneNumber';
import { isAdminAuthenticated } from '@/lib/adminAuth';

// GET /api/admin/phones - Get all saved contacts
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();

    // Get all saved contacts from the legacy PhoneNumber collection
    const phoneDocuments = await PhoneNumber.find({})
      .sort({ phone: -1 })
      .select('phone -_id')
      .lean();

    const phones = phoneDocuments.map(doc => doc.phone);

    return NextResponse.json(phones);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/phones - Add a new saved contact
export async function POST(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();

    const { phone } = await request.json();

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: 'Contact is required' },
        { status: 400 }
      );
    }

    // Check if contact already exists
    const existing = await PhoneNumber.findOne({ phone: phone.trim() });
    if (existing) {
      return NextResponse.json(
        { error: 'Contact already exists' },
        { status: 409 }
      );
    }

    // Create new saved contact
    const newPhone = await PhoneNumber.create({ phone: phone.trim() });

    return NextResponse.json({ 
      success: true, 
      phone: newPhone.phone 
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json(
      { error: 'Failed to add contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/phones - Delete a saved contact
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json(
        { error: 'Contact is required' },
        { status: 400 }
      );
    }

    const result = await PhoneNumber.deleteOne({ phone });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contact deleted' 
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
