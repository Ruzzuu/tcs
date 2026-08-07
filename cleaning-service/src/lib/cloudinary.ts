// ============================================
// CLOUDINARY CONFIGURATION (Server-Only)
// ============================================
// This file should ONLY be imported in API routes (server-side)
// Never import this in client components

import { v2 as cloudinary } from 'cloudinary';
import { ACTIVE_TENANT } from '@/config/tenant';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS
});

const configuredBaseFolder = process.env.CLOUDINARY_BASE_FOLDER?.trim();

if (configuredBaseFolder && !/^[a-zA-Z0-9/_-]+$/.test(configuredBaseFolder)) {
  throw new Error('CLOUDINARY_BASE_FOLDER contains unsupported characters');
}

if (configuredBaseFolder && configuredBaseFolder !== ACTIVE_TENANT.cloudinaryBaseFolder) {
  throw new Error(
    `CLOUDINARY_BASE_FOLDER does not match tenant ${ACTIVE_TENANT.id}; expected ${ACTIVE_TENANT.cloudinaryBaseFolder}`
  );
}

export const CLOUDINARY_BASE_FOLDER = ACTIVE_TENANT.cloudinaryBaseFolder;

// Folder structure for organized, deployment-scoped storage
export const CLOUDINARY_FOLDERS = {
  BEFORE: `${CLOUDINARY_BASE_FOLDER}/orders/before`,
  AFTER: `${CLOUDINARY_BASE_FOLDER}/orders/after`,
  INVOICES: `${CLOUDINARY_BASE_FOLDER}/invoices`,
  NOTA: `${CLOUDINARY_BASE_FOLDER}/nota`,
} as const;

const MANAGED_FOLDERS = Object.values(CLOUDINARY_FOLDERS);

export function isCloudinaryPublicIdInFolder(publicId: string, folder: string): boolean {
  return publicId.startsWith(`${folder}/`);
}

export function isManagedCloudinaryPublicId(publicId: string): boolean {
  return MANAGED_FOLDERS.some((folder) => isCloudinaryPublicIdInFolder(publicId, folder));
}

function assertManagedCloudinaryPublicId(publicId: string): void {
  if (!isManagedCloudinaryPublicId(publicId)) {
    throw new Error(`Cloudinary asset is outside tenant ${ACTIVE_TENANT.id} folders`);
  }
}

// Allowed file types
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Max file size (5MB for free tier safety)
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Image type for MongoDB storage
export interface CloudinaryImage {
  url: string;        // Optimized delivery URL
  publicId: string;   // For deletion/management
}

/**
 * Upload image to Cloudinary
 * @param buffer - Image buffer
 * @param folder - Target folder
 * @param orderId - Order ID for naming
 * @returns CloudinaryImage with url and publicId
 */
export async function uploadImage(
  buffer: Buffer,
  folder: string,
  orderId: string
): Promise<CloudinaryImage> {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const publicId = `${orderId}_${timestamp}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        // Optimization on upload
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        // Keep original for proof-of-work
        eager: [
          { width: 800, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          // Return optimized URL with f_auto and q_auto
          const optimizedUrl = cloudinary.url(result.public_id, {
            fetch_format: 'auto',
            quality: 'auto',
            secure: true,
          });
          
          resolve({
            url: optimizedUrl,
            publicId: result.public_id,
          });
        } else {
          reject(new Error('Upload failed: No result'));
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Delete image from Cloudinary
 * @param publicId - The public_id of the image to delete
 */
export async function deleteImage(publicId: string): Promise<void> {
  assertManagedCloudinaryPublicId(publicId);

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
    // Don't throw - deletion failure shouldn't break the app
  }
}

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of public_ids to delete
 */
export async function deleteImages(publicIds: string[]): Promise<void> {
  if (publicIds.length === 0) return;

  publicIds.forEach(assertManagedCloudinaryPublicId);
  
  try {
    await cloudinary.api.delete_resources(publicIds);
  } catch (error) {
    console.error('Failed to delete images from Cloudinary:', error);
  }
}

/**
 * Get optimized URL for an existing image
 * @param publicId - The public_id of the image
 * @param options - Optional transformation options
 */
export function getOptimizedUrl(
  publicId: string,
  options?: { width?: number; height?: number; crop?: string }
): string {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    secure: true,
    ...options,
  });
}

/**
 * Get thumbnail URL (for order cards)
 * @param publicId - The public_id of the image
 */
export function getThumbnailUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'auto',
    fetch_format: 'auto',
    quality: 'auto',
    secure: true,
  });
}

export default cloudinary;
