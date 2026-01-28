// ============================================
// PHOTO MANAGEMENT API FOR ORDERS
// ============================================
// DELETE /api/orders/[id]/photos?publicId=xxx&type=before|after|nota
// POST /api/orders/[id]/photos - Add photo to order

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { v2 as cloudinary } from 'cloudinary';

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

// POST - Add photo to existing order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    const { url, publicId, type } = body;

    // Validation
    if (!url || !publicId) {
      return NextResponse.json(
        { success: false, error: 'url and publicId are required' },
        { status: 400 }
      );
    }

    if (!type || !['before', 'after', 'nota'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be: before, after, or nota' },
        { status: 400 }
      );
    }

    // Get the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Build update query based on type
    let updateQuery: any = {};
    
    if (type === 'before') {
      updateQuery = {
        $push: {
          'proofOfWork.beforePhotos': { url, publicId }
        }
      };
    } else if (type === 'after') {
      updateQuery = {
        $push: {
          'proofOfWork.afterPhotos': { url, publicId }
        }
      };
    } else if (type === 'nota') {
      // For nota, replace the single image
      updateQuery = {
        $set: {
          notaImage: { url, publicId }
        }
      };
    }

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Foto berhasil ditambahkan',
      data: updatedOrder
    });

  } catch (error) {
    console.error('POST /api/orders/[id]/photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan foto' },
      { status: 500 }
    );
  }
}

// DELETE - Remove individual photo from order
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    
    const publicId = searchParams.get('publicId');
    const type = searchParams.get('type'); // 'before', 'after', or 'nota'

    // Validation
    if (!publicId) {
      return NextResponse.json(
        { success: false, error: 'publicId is required' },
        { status: 400 }
      );
    }

    if (!type || !['before', 'after', 'nota'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be: before, after, or nota' },
        { status: 400 }
      );
    }

    // Get the order
    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary first
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary delete result for ${publicId}:`, result);
      
      if (result.result !== 'ok' && result.result !== 'not found') {
        console.warn(`Cloudinary deletion warning: ${result.result}`);
      }
    } catch (error) {
      console.error(`Failed to delete from Cloudinary: ${publicId}`, error);
      // Continue to remove from MongoDB even if Cloudinary fails
    }

    // Remove from MongoDB array based on type
    let updateQuery: any = {};
    
    if (type === 'before') {
      updateQuery = {
        $pull: {
          'proofOfWork.beforePhotos': { publicId: publicId }
        }
      };
    } else if (type === 'after') {
      updateQuery = {
        $pull: {
          'proofOfWork.afterPhotos': { publicId: publicId }
        }
      };
    } else if (type === 'nota') {
      // For nota, we need to check if the publicId matches
      if (order.notaImage?.publicId === publicId) {
        updateQuery = {
          $unset: { notaImage: '' }
        };
      } else {
        return NextResponse.json(
          { success: false, error: 'Nota image not found with this publicId' },
          { status: 404 }
        );
      }
    }

    // Update the order in MongoDB
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateQuery,
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Failed to update order' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Foto berhasil dihapus',
      data: updatedOrder
    });

  } catch (error) {
    console.error('DELETE /api/orders/[id]/photos error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus foto' },
      { status: 500 }
    );
  }
}
