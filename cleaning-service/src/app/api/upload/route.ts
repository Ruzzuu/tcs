// ============================================
// IMAGE UPLOAD API ROUTE
// ============================================
// POST /api/upload - Upload image to Cloudinary
// Server-side only, returns Cloudinary URL

import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/adminAuth';
import { 
  uploadImage, 
  CLOUDINARY_FOLDERS, 
  ALLOWED_FILE_TYPES, 
  MAX_FILE_SIZE,
  CloudinaryImage 
} from '@/lib/cloudinary';

export const runtime = 'nodejs';

interface UploadResponse {
  success: boolean;
  data?: CloudinaryImage;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    if (!(await isAdminAuthenticated(request))) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    
    // Get file and metadata
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as 'before' | 'after' | 'invoice' | 'nota' | null;
    const orderId = formData.get('orderId') as string | null;

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!type || !['before', 'after', 'invoice', 'nota'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be: before, after, invoice, or nota' },
        { status: 400 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // File type validation
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPG, PNG, WebP' },
        { status: 400 }
      );
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size: 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine folder based on type
    let folder: string;
    switch (type) {
      case 'before':
        folder = CLOUDINARY_FOLDERS.BEFORE;
        break;
      case 'after':
        folder = CLOUDINARY_FOLDERS.AFTER;
        break;
      case 'invoice':
        folder = CLOUDINARY_FOLDERS.INVOICES;
        break;
      case 'nota':
        folder = CLOUDINARY_FOLDERS.NOTA;
        break;
      default:
        folder = CLOUDINARY_FOLDERS.BEFORE;
    }

    // Upload to Cloudinary
    const result = await uploadImage(buffer, folder, orderId);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
