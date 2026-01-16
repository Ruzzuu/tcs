// ============================================
// SINGLE ORDER API - Get, Update, Delete
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { v2 as cloudinary } from 'cloudinary';

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
    const allowedFields = ['status', 'notes', 'beforePhoto', 'afterPhoto', 'finalPrice', 'proofOfWork', 'notaImage'];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
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

    // Extract all image URLs from the order
    const imagesToDelete: string[] = [];
    
    // Add beforePhotos from proofOfWork
    if (order.proofOfWork?.beforePhotos && order.proofOfWork.beforePhotos.length > 0) {
      imagesToDelete.push(...order.proofOfWork.beforePhotos.map((img: any) => img.url));
    }
    
    // Add afterPhotos from proofOfWork
    if (order.proofOfWork?.afterPhotos && order.proofOfWork.afterPhotos.length > 0) {
      imagesToDelete.push(...order.proofOfWork.afterPhotos.map((img: any) => img.url));
    }
    
    // Add notaImage
    if (order.notaImage) {
      imagesToDelete.push(order.notaImage.url);
    }

    // Delete images from Cloudinary
    const deletePromises = imagesToDelete.map(async (imageUrl) => {
      try {
        // Extract public_id from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
        const urlParts = imageUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
          // Get everything after 'upload/v{version}/'
          const publicIdWithFormat = urlParts.slice(uploadIndex + 2).join('/');
          // Remove file extension
          const publicId = publicIdWithFormat.replace(/\.[^/.]+$/, '');
          
          // Delete from Cloudinary
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted image from Cloudinary: ${publicId}`);
        }
      } catch (error) {
        console.error(`Failed to delete image from Cloudinary: ${imageUrl}`, error);
        // Continue even if some images fail to delete
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
