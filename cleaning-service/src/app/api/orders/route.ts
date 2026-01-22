// ============================================
// ORDERS API - Create & List Orders
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { SERVICES } from '@/lib/services';
import { generateOrderNumber, isValidPhoneNumber } from '@/lib/utils';
import { ServiceType } from '@/types';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { createOrderItem, shouldAppendToOrder } from '@/lib/orderUtils';

// GET /api/orders - List orders (for admin)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const verified = searchParams.get('verified');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {};

    // Filter by verification status
    if (verified === 'true') {
      query['verification.status'] = 'approved';
    } else if (verified === 'false') {
      query['verification.status'] = 'unverified';
    }

    // Filter by order status
    if (status && ['pending', 'in_progress', 'finished', 'delivered', 'picked_up'].includes(status)) {
      query.status = status;
    }

    // Filter by date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Add 1 day to include the end date
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query.createdAt.$lt = end;
      }
    }

    // Search by name or phone or item
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { itemType: { $regex: search, $options: 'i' } },
        { customItemType: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create new order (customer submission)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { name, phone, address, items: submittedItems } = body;

    // Validation
    const errors: string[] = [];

    if (!name || name.trim().length < 2) {
      errors.push('Nama minimal 2 karakter');
    }

    if (!phone || !isValidPhoneNumber(phone)) {
      errors.push('Nomor WhatsApp tidak valid');
    }

    if (!submittedItems || !Array.isArray(submittedItems) || submittedItems.length === 0) {
      errors.push('Minimal 1 item harus diisi');
    }

    // Validate each item
    if (submittedItems && Array.isArray(submittedItems)) {
      submittedItems.forEach((item, index) => {
        if (!item.itemType || !SERVICES[item.itemType as ServiceType]) {
          errors.push(`Item ${index + 1}: Jenis barang tidak valid`);
        }
        if (item.itemType === 'other' && (!item.customItemType || item.customItemType.trim().length === 0)) {
          errors.push(`Item ${index + 1}: Nama barang wajib diisi untuk kategori Lainnya`);
        }
        if (!item.quantity || item.quantity < 1) {
          errors.push(`Item ${index + 1}: Jumlah minimal 1`);
        }
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    console.log('📦 Creating new order with', submittedItems.length, 'items');

    // Create order items array
    const orderItems = submittedItems.map((item: any) => 
      createOrderItem(
        item.itemType as ServiceType,
        item.quantity,
        item.itemType === 'other' ? item.customItemType?.trim() : undefined,
        item.notes?.trim()
      )
    );

    // Calculate totals
    const subtotal = orderItems.reduce((sum: number, item: any) => sum + item.subtotal, 0);

    console.log('💰 Order totals:', {
      items: orderItems.map((i: any) => ({ type: i.serviceType, qty: i.quantity, sub: i.subtotal })),
      subtotal
    });

    // Create new order - ONE order with multiple items
    const orderData: any = {
      orderNumber: generateOrderNumber(),
      name: name.trim(),
      phone: phone.trim(),
      address: address?.trim() || '',
      status: 'pending',
      verification: {
        status: 'unverified'
      },
      items: orderItems,
      // Legacy fields for backward compatibility  
      itemType: orderItems[0].serviceType,
      customItemType: orderItems[0].customItemType,
      quantity: orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
      subtotal: subtotal,
      estimatedPrice: subtotal,
      finalPrice: subtotal,
      customerNotes: orderItems.map((i: any) => i.notes).filter(Boolean).join('; ')
    };

    const order = new Order(orderData);
    await order.save();

    console.log('✅ Order created:', order.orderNumber);

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber
      },
      message: 'Pesanan berhasil dibuat'
    });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat pesanan' },
      { status: 500 }
    );
  }
}
