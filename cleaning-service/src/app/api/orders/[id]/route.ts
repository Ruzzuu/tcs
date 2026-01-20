// ============================================
// SINGLE ORDER API - Get, Update, Delete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { v2 as cloudinary } from 'cloudinary';
import { calculateTotal } from '@/lib/services';
import type { ServiceSelection, Discount } from '@/lib/services';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { calculateOrderTotal } from '@/lib/orderUtils';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/orders/[id] - Get single order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('GET /api/orders/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] - Update order
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    // Only allow certain fields to be updated
    const allowedFields = ['status', 'notes', 'beforePhoto', 'afterPhoto', 'finalPrice', 'proofOfWork', 'notaImage', 'discount'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Handle discount updates
    if ('discount' in body) {
      const order = await Order.findById(id);
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: 'Pesanan tidak ditemukan' },
          { status: 404 }
        );
      }

      if (body.discount === null) {
        // Remove discount - use $unset to completely remove the field
        const subtotal = isFeatureEnabled('MULTI_ITEM_ORDERS') && order.items?.length > 0
          ? order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0)
          : order.estimatedPrice;

        const updatedOrder = await Order.findByIdAndUpdate(
          id,
          {
            $unset: { discount: "" },
            $set: {
              subtotal: subtotal,
              finalPrice: subtotal
            }
          },
          { new: true, runValidators: true }
        ).lean();

        if (!updatedOrder) {
          return NextResponse.json(
            { success: false, error: 'Pesanan tidak ditemukan' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: updatedOrder,
          message: 'Diskon berhasil dihapus'
        });
      } else {
        // Apply discount
        const discount: Discount = body.discount;
        
        if (isFeatureEnabled('MULTI_ITEM_ORDERS') && order.items?.length > 0) {
          // Multi-item order: use new calculation method
          const subtotal = order.items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
          const pricing = calculateOrderTotal(order.items, discount);
          
          updateData.discount = discount;
          updateData.subtotal = subtotal;
          updateData.finalPrice = pricing.total;
        } else {
          // Legacy single-item order - check for required fields
          if (!order.itemType || order.quantity === undefined || !order.estimatedPrice) {
            return NextResponse.json(
              { success: false, error: 'Data pesanan tidak lengkap' },
              { status: 400 }
            );
          }
          
          const items: ServiceSelection[] = [{
            serviceKey: order.itemType,
            quantity: order.quantity,
            price: order.estimatedPrice / order.quantity
          }];

          const pricing = calculateTotal(items, discount);
          
          updateData.discount = discount;
          updateData.subtotal = pricing.subtotal;
          updateData.finalPrice = pricing.total;
        }
      }
    }

    // Set finishedAt when status changes to finished
    if (updateData.status === 'finished') {
      updateData.finishedAt = new Date();
      // Set TTL for auto-deletion (30 days)
      updateData.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Pesanan berhasil diperbarui'
    });
  } catch (error) {
    console.error('PATCH /api/orders/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui pesanan' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] - Delete order and all associated images
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;

    // First, get the order to retrieve image URLs
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Extract all publicIds from the order for Cloudinary deletion
    const publicIdsToDelete: string[] = [];
    
    // Add beforePhotos from proofOfWork
    if (order.proofOfWork?.beforePhotos && order.proofOfWork.beforePhotos.length > 0) {
      order.proofOfWork.beforePhotos.forEach((img: any) => {
        if (img.publicId) {
          publicIdsToDelete.push(img.publicId);
        }
      });
    }
    
    // Add afterPhotos from proofOfWork
    if (order.proofOfWork?.afterPhotos && order.proofOfWork.afterPhotos.length > 0) {
      order.proofOfWork.afterPhotos.forEach((img: any) => {
        if (img.publicId) {
          publicIdsToDelete.push(img.publicId);
        }
      });
    }
    
    // Add notaImage
    if (order.notaImage?.publicId) {
      publicIdsToDelete.push(order.notaImage.publicId);
    }

    console.log('Public IDs to delete from Cloudinary:', publicIdsToDelete);

    // Delete images from Cloudinary
    const deletePromises = publicIdsToDelete.map(async (publicId) => {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`Cloudinary delete result for ${publicId}:`, result);
        return result;
      } catch (error) {
        console.error(`Failed to delete image from Cloudinary: ${publicId}`, error);
        // Continue even if some images fail to delete
        return null;
      }
    });

    // Wait for all delete operations to complete
    await Promise.allSettled(deletePromises);

    // Delete order from MongoDB
    await Order.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Pesanan dan semua gambar berhasil dihapus'
    });
  } catch (error) {
    console.error('DELETE /api/orders/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus pesanan' },
      { status: 500 }
    );
  }
}
