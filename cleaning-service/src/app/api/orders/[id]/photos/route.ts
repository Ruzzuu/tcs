// ============================================
// PHOTO MANAGEMENT API FOR ORDERS
// ============================================
// DELETE /api/orders/[id]/photos?publicId=xxx&type=before|after|nota
// POST /api/orders/[id]/photos - Add photo to order

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import {
  CLOUDINARY_FOLDERS,
  deleteImage,
  isCloudinaryPublicIdInFolder,
} from '@/lib/cloudinary';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type PhotoType = 'before' | 'after' | 'nota';

function getPhotoFolder(type: PhotoType): string {
  if (type === 'before') return CLOUDINARY_FOLDERS.BEFORE;
  if (type === 'after') return CLOUDINARY_FOLDERS.AFTER;
  return CLOUDINARY_FOLDERS.NOTA;
}

// POST - Add photo to existing order
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

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

    const photoType = type as PhotoType;
    if (!isCloudinaryPublicIdInFolder(publicId, getPhotoFolder(photoType))) {
      return NextResponse.json(
        { success: false, error: 'Photo does not belong to this tenant or photo type' },
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
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

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

    const photoType = type as PhotoType;
    if (!isCloudinaryPublicIdInFolder(publicId, getPhotoFolder(photoType))) {
      return NextResponse.json(
        { success: false, error: 'Photo does not belong to this tenant or photo type' },
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

    const photoExistsOnOrder = photoType === 'before'
      ? order.proofOfWork?.beforePhotos?.some((photo: { publicId?: string }) => photo.publicId === publicId)
      : photoType === 'after'
        ? order.proofOfWork?.afterPhotos?.some((photo: { publicId?: string }) => photo.publicId === publicId)
        : order.notaImage?.publicId === publicId;

    if (!photoExistsOnOrder) {
      return NextResponse.json(
        { success: false, error: 'Photo is not attached to this order' },
        { status: 404 }
      );
    }

    // Delete from Cloudinary first. Database cleanup still continues if the
    // provider is temporarily unavailable, matching the previous behavior.
    try {
      await deleteImage(publicId);
    } catch (error) {
      console.error(`Failed to delete from Cloudinary: ${publicId}`, error);
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
