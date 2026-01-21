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

    if (multiItemEnabled && autoMergeEnabled) {
      // Try to find existing pending order for this customer
      console.log('🔍 Looking for existing order with phone:', phone.trim());
      
      const existingOrder = await Order.findOne({
        phone: phone.trim(),
        status: 'pending'
      }).sort({ createdAt: -1 });

      console.log('📦 Found existing order:', existingOrder ? {
        id: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        phone: existingOrder.phone,
        status: existingOrder.status,
        createdAt: existingOrder.createdAt,
        hasItems: !!existingOrder.items,
        itemsLength: existingOrder.items?.length || 0
      } : null);

      if (existingOrder) {
        const shouldMerge = shouldAppendToOrder(existingOrder, phone.trim(), address?.trim() || '');
        console.log('🤔 Should merge?', shouldMerge);
        
        if (shouldMerge) {
          console.log('✅ MERGING ORDER - Appending new item to existing order');
          // Append item to existing order
          const newItem = createOrderItem(
            itemType as ServiceType,
            quantity,
            itemType === 'other' ? customItemType?.trim() : undefined,
            customerNotes?.trim()
          );

          // Ensure items array exists
          if (!existingOrder.items) {
            existingOrder.items = [];
          }

          existingOrder.items.push(newItem);
          console.log('📝 Items after push:', existingOrder.items.length);
        
          // Recalculate totals
          const subtotal = existingOrder.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
          console.log('💰 Calculated subtotal:', subtotal);
          
          existingOrder.subtotal = subtotal;
          existingOrder.estimatedPrice = subtotal;
          
          // Calculate final price with discount
          let finalPrice = subtotal;
          if (existingOrder.discount) {
            const discountValue = Number(existingOrder.discount.value) || 0;
            if (existingOrder.discount.type === 'percentage') {
              const discountAmount = Math.round((subtotal * discountValue) / 100);
              finalPrice = subtotal - discountAmount;
            } else {
              finalPrice = subtotal - discountValue;
            }
          }
          existingOrder.finalPrice = Math.max(0, finalPrice);
          
          console.log('💵 Final price:', existingOrder.finalPrice);
        }

        await existingOrder.save();

        console.log('💾 Order saved with merged items. Total items:', existingOrder.items?.length ?? 0);

        return NextResponse.json({
          success: true,
          data: {
            orderId: existingOrder._id,
            orderNumber: existingOrder.orderNumber,
            merged: true
          },
          message: 'Item berhasil ditambahkan ke pesanan yang ada'
        });
      }
    }

    console.log('➕ Creating NEW order (no merge)');

    // Create new order (legacy single-item or new multi-item)
    const orderData: any = {
      orderNumber: generateOrderNumber(),
      name: name.trim(),
      phone: phone.trim(),
      address: address?.trim() || '',
      status: 'pending',
      verification: {
        status: 'unverified'
      }
    };

    if (isFeatureEnabled('MULTI_ITEM_ORDERS')) {
      // Create order with items array
      const newItem = createOrderItem(
        itemType as ServiceType,
        quantity,
        itemType === 'other' ? customItemType?.trim() : undefined,
        customerNotes?.trim()
      );

      orderData.items = [newItem];
      orderData.subtotal = estimatedPrice;
      orderData.estimatedPrice = estimatedPrice;
      orderData.finalPrice = estimatedPrice;
    } else {
      // Legacy single-item format
      orderData.itemType = itemType;
      orderData.customItemType = itemType === 'other' ? customItemType?.trim() : undefined;
      orderData.quantity = quantity;
      orderData.estimatedPrice = estimatedPrice;
      orderData.customerNotes = customerNotes?.trim() || '';
      // Set subtotal and finalPrice for schema validation
      orderData.subtotal = estimatedPrice;
      orderData.finalPrice = estimatedPrice;
    }

    const order = new Order(orderData);

    await order.save();

    return NextResponse.json({
      success: true,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        merged: false
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
