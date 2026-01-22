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
    const { name, phone, address, itemType, quantity, customItemType, customerNotes } = body;

    // Validation
    const errors: string[] = [];

    if (!name || name.trim().length < 2) {
      errors.push('Nama minimal 2 karakter');
    }

    if (!phone || !isValidPhoneNumber(phone)) {
      errors.push('Nomor WhatsApp tidak valid');
    }

    if (!itemType || !SERVICES[itemType as ServiceType]) {
      errors.push('Jenis barang tidak valid');
    }

    // Custom Item Validation
    if (itemType === 'other' && (!customItemType || customItemType.trim().length === 0)) {
      errors.push('Nama barang wajib diisi untuk kategori Lainnya');
    }

    if (!quantity || quantity < 1) {
      errors.push('Jumlah minimal 1');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Calculate price
    const service = SERVICES[itemType as ServiceType];
    const estimatedPrice = service.price * quantity;

    // Check if multi-item orders feature is enabled
    const multiItemEnabled = isFeatureEnabled('MULTI_ITEM_ORDERS');
    const autoMergeEnabled = isFeatureEnabled('AUTO_MERGE_ORDERS');
    console.log('🚩 Feature Flags:', { multiItemEnabled, autoMergeEnabled });
    console.log('🚩 ENV vars:', { 
      MULTI_ITEM: process.env.NEXT_PUBLIC_FEATURE_MULTI_ITEM,
      AUTO_MERGE: process.env.NEXT_PUBLIC_FEATURE_AUTO_MERGE 
    });

    // ALWAYS try to merge if same phone number, same day, pending status
    // This works regardless of feature flags for better UX
    
    // Try to find existing pending order for this customer today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const phoneNormalized = phone.trim().replace(/\s+/g, '').replace(/^0/, '62').replace(/^\+/, '');
    console.log('🔍 Looking for existing order with phone:', phone.trim(), 'normalized:', phoneNormalized, 'created today:', todayStart);
    
    // Calculate new item
    const newItem = createOrderItem(
      itemType as ServiceType,
      quantity,
      itemType === 'other' ? customItemType?.trim() : undefined,
      customerNotes?.trim()
    );
    
    // Simple approach: Find ANY pending unverified order from same phone today
    // Use a single query that handles both legacy and multi-item orders
    const existingOrders = await Order.find({
      phone: phone.trim(),
      status: 'pending',
      'verification.status': 'unverified',
      createdAt: { $gte: todayStart }
    }).sort({ createdAt: -1 }).limit(1);
    
    console.log('📦 Found orders:', existingOrders.length);
    
    if (existingOrders.length > 0) {
      const existingOrder = existingOrders[0];
      console.log('📦 Existing order found:', {
        id: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        hasItems: !!existingOrder.items,
        itemsLength: existingOrder.items?.length || 0,
        itemType: existingOrder.itemType
      });
      
      // Initialize items array if not exists
      if (!existingOrder.items || existingOrder.items.length === 0) {
        // Convert legacy order to multi-item format
        const legacyItem = createOrderItem(
          existingOrder.itemType as ServiceType,
          existingOrder.quantity || 1,
          existingOrder.customItemType,
          existingOrder.customerNotes
        );
        existingOrder.items = [legacyItem];
        console.log('📦 Converted legacy order to multi-item format');
      }
      
      // Add new item
      existingOrder.items.push(newItem);
      
      // Recalculate totals - ALWAYS recalculate from items array
      const subtotal = existingOrder.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      
      console.log('💰 Recalculating prices:', {
        itemsCount: existingOrder.items.length,
        subtotal,
        hasDiscount: !!existingOrder.discount,
        discount: existingOrder.discount
      });
      
      // Update all price fields
      existingOrder.subtotal = subtotal;
      existingOrder.estimatedPrice = subtotal; // Always sync with subtotal
      
      // Calculate final price with discount if exists
      let finalPrice = subtotal;
      if (existingOrder.discount && existingOrder.discount.value > 0) {
        const discountValue = Number(existingOrder.discount.value) || 0;
        
        if (existingOrder.discount.type === 'percentage') {
          const discountAmount = Math.round((subtotal * discountValue) / 100);
          finalPrice = subtotal - discountAmount;
          console.log('💰 Applied percentage discount:', { discountValue, discountAmount, finalPrice });
        } else {
          finalPrice = subtotal - discountValue;
          console.log('💰 Applied fixed discount:', { discountValue, finalPrice });
        }
      }
      
      existingOrder.finalPrice = Math.max(0, finalPrice);
      
      console.log('💰 Final prices:', {
        subtotal: existingOrder.subtotal,
        estimatedPrice: existingOrder.estimatedPrice,
        finalPrice: existingOrder.finalPrice
      });
      
      await existingOrder.save();
      
      console.log('✅ MERGED - Added item to existing order. Total items:', existingOrder.items?.length);

      return NextResponse.json({
        success: true,
        data: {
          orderId: existingOrder._id,
          orderNumber: existingOrder.orderNumber,
          merged: true,
          itemsCount: existingOrder.items?.length || 0
        },
        message: 'Item berhasil ditambahkan ke pesanan yang ada'
      });
    }

    console.log('➕ Creating NEW order (no merge)');

    // Create new order - ALWAYS with items array for new orders
    const orderItem = createOrderItem(
      itemType as ServiceType,
      quantity,
      itemType === 'other' ? customItemType?.trim() : undefined,
      customerNotes?.trim()
    );

    // Calculate prices correctly
    const subtotal = orderItem.subtotal; // This is already calculated in createOrderItem
    
    console.log('💰 Creating new order with prices:', {
      subtotal,
      itemPrice: orderItem.unitPrice,
      quantity: orderItem.quantity
    });
    
    const orderData: any = {
      orderNumber: generateOrderNumber(),
      name: name.trim(),
      phone: phone.trim(),
      address: address?.trim() || '',
      status: 'pending',
      verification: {
        status: 'unverified'
      },
      // Always use items array format
      items: [orderItem],
      itemType: itemType, // Keep legacy field for backward compatibility
      customItemType: itemType === 'other' ? customItemType?.trim() : undefined,
      quantity: quantity,
      subtotal: subtotal,
      estimatedPrice: subtotal, // Always equal to subtotal
      finalPrice: subtotal, // No discount initially
      customerNotes: customerNotes?.trim() || ''
    };

    const order = new Order(orderData);

    await order.save();

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        merged: false,
        itemsCount: 1
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
